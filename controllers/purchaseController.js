const pool = require('../config/db');

// List purchases with a compact item count for the history page.
exports.getPurchases = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT p.purchase_id, p.purchase_date, p.total_amount,
                   s.business_name AS supplier_name,
                   COALESCE(SUM(pd.quantity), 0) AS total_boxes,
                   COUNT(pd.purchase_detail_id) AS item_count
            FROM purchases p
            JOIN suppliers s ON s.supplier_id = p.supplier_id
            LEFT JOIN purchasedetails pd ON pd.purchase_id = p.purchase_id
            GROUP BY p.purchase_id, p.purchase_date, p.total_amount, s.business_name
            ORDER BY p.purchase_date DESC, p.purchase_id DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Return the supplier and line items for a selected purchase.
exports.getPurchaseById = async (req, res) => {
    try {
        const [purchaseRows] = await pool.query(`
            SELECT p.purchase_id, p.purchase_date, p.total_amount,
                   s.business_name AS supplier_name, s.contact_person, s.phone
            FROM purchases p
            JOIN suppliers s ON s.supplier_id = p.supplier_id
            WHERE p.purchase_id = ?
        `, [req.params.id]);

        if (purchaseRows.length === 0) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        const [items] = await pool.query(`
            SELECT pd.purchase_detail_id, pd.fruit_id, f.fruit_name,
                   pd.packaging_size, pd.quantity, pd.unit_cost,
                   (pd.quantity * pd.unit_cost) AS line_total
            FROM purchasedetails pd
            JOIN fruits f ON f.fruit_id = pd.fruit_id
            WHERE pd.purchase_id = ?
            ORDER BY pd.purchase_detail_id
        `, [req.params.id]);

        res.status(200).json({ ...purchaseRows[0], items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Record a new purchase (Increases Stock)
exports.createPurchase = async (req, res) => {
    // Body: { supplier_id: 1, items: [{ fruit_id, quantity, unit_cost, packaging_size }] }
    const { supplier_id, items } = req.body || {};
    const validSizes = ['SMALL', 'MEDIUM', 'LARGE'];
    const maxTotalCents = 999999999999; // DECIMAL(12,2)

    if (!Number.isSafeInteger(Number(supplier_id)) || Number(supplier_id) <= 0) {
        return res.status(400).json({ error: 'A valid supplier_id is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Purchase must contain at least one item' });
    }

    const normalizedItems = [];
    let totalCents = 0;
    for (const [index, item] of items.entries()) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return res.status(400).json({ error: `Item ${index + 1} must be an object` });
        }

        const fruitId = Number(item.fruit_id);
        const quantity = Number(item.quantity);
        const unitCost = Number(item.unit_cost);
        const packagingSize = String(item.packaging_size || '').trim().toUpperCase();

        if (!Number.isSafeInteger(fruitId) || fruitId <= 0) {
            return res.status(400).json({ error: `Item ${index + 1} requires a valid fruit_id` });
        }
        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ error: `Item ${index + 1} quantity must be a positive whole number` });
        }
        if (!Number.isFinite(unitCost) || unitCost <= 0 || unitCost > 99999999.99 ||
            Math.abs(unitCost * 100 - Math.round(unitCost * 100)) > 1e-8) {
            return res.status(400).json({ error: `Item ${index + 1} unit_cost must be a positive amount with up to two decimal places` });
        }
        if (!validSizes.includes(packagingSize)) {
            return res.status(400).json({ error: `Item ${index + 1} packaging_size must be SMALL, MEDIUM, or LARGE` });
        }

        const unitCostCents = Math.round(unitCost * 100);
        const lineTotalCents = unitCostCents * quantity;
        if (!Number.isSafeInteger(lineTotalCents) || totalCents + lineTotalCents > maxTotalCents) {
            return res.status(400).json({ error: 'Purchase total exceeds the supported amount' });
        }
        totalCents += lineTotalCents;
        normalizedItems.push({
            fruit_id: fruitId,
            quantity,
            unit_cost: (unitCostCents / 100).toFixed(2),
            packaging_size: packagingSize,
            purchase_packaging_size: packagingSize[0] + packagingSize.slice(1).toLowerCase()
        });
    }

    let connection;
    let transactionStarted = false;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [supplierRows] = await connection.query(
            'SELECT supplier_id FROM suppliers WHERE supplier_id = ?',
            [Number(supplier_id)]
        );
        if (supplierRows.length === 0) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({ error: 'Supplier not found' });
        }

        const fruitIds = [...new Set(normalizedItems.map(item => item.fruit_id))];
        const placeholders = fruitIds.map(() => '?').join(', ');
        const [fruitRows] = await connection.query(
            `SELECT fruit_id FROM fruits WHERE fruit_id IN (${placeholders})`,
            fruitIds
        );
        const existingFruitIds = new Set(fruitRows.map(row => Number(row.fruit_id)));
        const missingFruitId = fruitIds.find(id => !existingFruitIds.has(id));
        if (missingFruitId) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({ error: `Fruit ${missingFruitId} not found` });
        }

        const [purchaseResult] = await connection.query(
            'INSERT INTO purchases (supplier_id, total_amount) VALUES (?, ?)',
            [Number(supplier_id), (totalCents / 100).toFixed(2)]
        );
        const purchaseId = purchaseResult.insertId;

        for (const item of normalizedItems) {
            await connection.query(
                'INSERT INTO purchasedetails (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES (?, ?, ?, ?, ?)',
                [purchaseId, item.fruit_id, item.quantity, item.unit_cost, item.purchase_packaging_size]
            );

            // Stock uses uppercase packaging values; the unique fruit/size key makes this atomic for existing stock rows.
            await connection.query(
                `INSERT INTO stock (fruit_id, packaging_size, available_quantity)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE available_quantity = available_quantity + ?`,
                [item.fruit_id, item.packaging_size, item.quantity, item.quantity]
            );
        }

        await connection.commit();
        transactionStarted = false;
        return res.status(201).json({
            message: 'Purchase recorded and stock updated successfully',
            purchase_id: purchaseId,
            total_amount: (totalCents / 100).toFixed(2),
            items_recorded: normalizedItems.length
        });
    } catch (error) {
        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Purchase rollback failed:', rollbackError);
            }
        }
        console.error(error);
        return res.status(500).json({
            error: 'Failed to record purchase. No purchase or stock changes were saved.',
            details: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};