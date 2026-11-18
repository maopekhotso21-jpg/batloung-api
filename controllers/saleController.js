const pool = require('../config/db');

// List sales with vendor and box-count summaries for the sales history table.
exports.getSales = async (req, res) => {
    try {
        const [rows] = await pool.query(`
                 SELECT s.sale_id, s.sale_date, s.total_amount, v.vendor_name,
                   COALESCE(SUM(sd.quantity), 0) AS total_boxes,
                   COUNT(sd.sale_detail_id) AS item_count
            FROM sales s
            JOIN vendors v ON v.vendor_id = s.vendor_id
            LEFT JOIN salesdetails sd ON sd.sale_id = s.sale_id
            GROUP BY s.sale_id, s.sale_date, s.total_amount, v.vendor_name
            ORDER BY s.sale_date DESC, s.sale_id DESC
        `);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Return the vendor and line items for a selected sale.
exports.getSaleById = async (req, res) => {
    try {
        const [saleRows] = await pool.query(`
                 SELECT s.sale_id, s.sale_date, s.total_amount,
                   v.vendor_name, v.phone_number, v.location
            FROM sales s
            JOIN vendors v ON v.vendor_id = s.vendor_id
            WHERE s.sale_id = ?
        `, [req.params.id]);

        if (saleRows.length === 0) {
            return res.status(404).json({ error: 'Sale not found' });
        }

        const [items] = await pool.query(`
            SELECT sd.sale_detail_id, sd.fruit_id, f.fruit_name,
                   sd.packaging_size, sd.quantity, sd.unit_price,
                   (sd.quantity * sd.unit_price) AS line_total
            FROM salesdetails sd
            JOIN fruits f ON f.fruit_id = sd.fruit_id
            WHERE sd.sale_id = ?
            ORDER BY sd.sale_detail_id
        `, [req.params.id]);

        res.status(200).json({ ...saleRows[0], items });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Record a new sale (Decreases Stock, handles payments)
exports.createSale = async (req, res) => {
    // Body: { vendor_id, payment_method?, amount_paid?, items: [{ fruit_id, packaging_size, quantity, unit_price }] }
    const { vendor_id, payment_method, amount_paid, items } = req.body || {};
    const validSizes = ['SMALL', 'MEDIUM', 'LARGE'];
    const validPaymentMethods = ['CASH', 'MOBILE_MONEY', 'CREDIT'];
    const maxTotalCents = 999999999999; // DECIMAL(12,2)

    if (!Number.isSafeInteger(Number(vendor_id)) || Number(vendor_id) <= 0) {
        return res.status(400).json({ error: 'A valid vendor_id is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Sale must contain at least one item' });
    }

    const normalizedItems = [];
    const requestedStock = new Map();
    let totalCents = 0;

    for (const [index, item] of items.entries()) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return res.status(400).json({ error: `Item ${index + 1} must be an object` });
        }

        const fruitId = Number(item.fruit_id);
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unit_price);
        const packagingSize = String(item.packaging_size || '').trim().toUpperCase();

        if (!Number.isSafeInteger(fruitId) || fruitId <= 0) {
            return res.status(400).json({ error: `Item ${index + 1} requires a valid fruit_id` });
        }
        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            return res.status(400).json({ error: `Item ${index + 1} quantity must be a positive whole number` });
        }
        if (!Number.isFinite(unitPrice) || unitPrice <= 0 || unitPrice > 99999999.99 ||
            Math.abs(unitPrice * 100 - Math.round(unitPrice * 100)) > 1e-8) {
            return res.status(400).json({ error: `Item ${index + 1} unit_price must be a positive amount with up to two decimal places` });
        }
        if (!validSizes.includes(packagingSize)) {
            return res.status(400).json({ error: `Item ${index + 1} packaging_size must be SMALL, MEDIUM, or LARGE` });
        }

        const unitPriceCents = Math.round(unitPrice * 100);
        const lineTotalCents = unitPriceCents * quantity;
        if (!Number.isSafeInteger(lineTotalCents) || totalCents + lineTotalCents > maxTotalCents) {
            return res.status(400).json({ error: 'Sale total exceeds the supported amount' });
        }
        totalCents += lineTotalCents;

        const stockKey = `${fruitId}:${packagingSize}`;
        requestedStock.set(stockKey, (requestedStock.get(stockKey) || 0) + quantity);
        normalizedItems.push({
            fruit_id: fruitId,
            quantity,
            unit_price: (unitPriceCents / 100).toFixed(2),
            packaging_size: packagingSize,
            sales_packaging_size: packagingSize[0] + packagingSize.slice(1).toLowerCase()
        });
    }

    const paymentMethod = String(payment_method || 'CASH').trim().toUpperCase();
    if (!validPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({ error: 'payment_method must be CASH, MOBILE_MONEY, or CREDIT' });
    }

    const amountPaid = amount_paid === undefined ? 0 : Number(amount_paid);
    if (!Number.isFinite(amountPaid) || amountPaid < 0 || amountPaid > 9999999999.99 ||
        Math.abs(amountPaid * 100 - Math.round(amountPaid * 100)) > 1e-8) {
        return res.status(400).json({ error: 'amount_paid must be a non-negative amount with up to two decimal places' });
    }
    const amountPaidCents = Math.round(amountPaid * 100);
    if (amountPaidCents > totalCents) {
        return res.status(400).json({ error: 'amount_paid cannot be greater than the sale total' });
    }

    let connection;
    let transactionStarted = false;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [vendorRows] = await connection.query(
            'SELECT vendor_id FROM vendors WHERE vendor_id = ?',
            [Number(vendor_id)]
        );
        if (vendorRows.length === 0) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({ error: 'Vendor not found' });
        }

        // Lock each distinct stock row in stable order; duplicate sale lines are checked together.
        const stockEntries = [...requestedStock.entries()].sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
        for (const [stockKey, requestedQuantity] of stockEntries) {
            const [fruitId, packagingSize] = stockKey.split(':');
            const [stockRows] = await connection.query(
                'SELECT available_quantity FROM stock WHERE fruit_id = ? AND packaging_size = ? FOR UPDATE',
                [Number(fruitId), packagingSize]
            );
            const available = stockRows.length ? Number(stockRows[0].available_quantity) : 0;
            if (available < requestedQuantity) {
                const error = new Error(`Insufficient stock for fruit ID ${fruitId} (${packagingSize}). Requested: ${requestedQuantity}, Available: ${available}`);
                error.statusCode = 409;
                throw error;
            }
        }

        const paymentStatus = amountPaidCents === totalCents
            ? 'PAID'
            : amountPaidCents > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
        const [saleResult] = await connection.query(
            'INSERT INTO sales (vendor_id, payment_status, payment_method, amount_paid, total_amount) VALUES (?, ?, ?, ?, ?)',
            [Number(vendor_id), paymentStatus, paymentMethod, (amountPaidCents / 100).toFixed(2), (totalCents / 100).toFixed(2)]
        );
        const saleId = saleResult.insertId;

        for (const item of normalizedItems) {
            await connection.query(
                'INSERT INTO salesdetails (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
                [saleId, item.fruit_id, item.sales_packaging_size, item.quantity, item.unit_price]
            );
        }

        for (const [stockKey, requestedQuantity] of stockEntries) {
            const [fruitId, packagingSize] = stockKey.split(':');
            const [updateResult] = await connection.query(
                'UPDATE stock SET available_quantity = available_quantity - ? WHERE fruit_id = ? AND packaging_size = ? AND available_quantity >= ?',
                [requestedQuantity, Number(fruitId), packagingSize, requestedQuantity]
            );
            if (updateResult.affectedRows !== 1) {
                const error = new Error(`Stock changed before sale could be completed for fruit ID ${fruitId} (${packagingSize})`);
                error.statusCode = 409;
                throw error;
            }
        }

        await connection.commit();
        transactionStarted = false;
        return res.status(201).json({
            message: 'Sale recorded and stock updated successfully',
            sale_id: saleId,
            total_amount: (totalCents / 100).toFixed(2),
            amount_paid: (amountPaidCents / 100).toFixed(2),
            payment_status: paymentStatus,
            items_recorded: normalizedItems.length
        });
    } catch (error) {
        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Sale rollback failed:', rollbackError);
            }
        }
        if (error.statusCode === 409) {
            return res.status(409).json({ error: error.message });
        }
        console.error(error);
        return res.status(500).json({ error: 'Failed to record sale. No sale or stock changes were saved.' });
    } finally {
        if (connection) connection.release();
    }
};

// Get outstanding balances for all vendors
exports.getOutstandingBalances = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.vendor_id, v.vendor_name, 
                   SUM(s.total_amount) AS total_sales,
                   SUM(s.amount_paid) AS total_paid,
                   SUM(s.total_amount - s.amount_paid) AS outstanding_balance
            FROM vendors v
            JOIN sales s ON v.vendor_id = s.vendor_id
            GROUP BY v.vendor_id
            HAVING outstanding_balance > 0
        `);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};