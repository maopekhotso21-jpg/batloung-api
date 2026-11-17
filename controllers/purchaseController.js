const pool = require('../config/db');

// Record a new purchase (Increases Stock)
exports.createPurchase = async (req, res) => {
    // Expected body: { supplier_id: 1, items: [ { fruit_id: 1, quantity: 10, unit_cost: 15.50, packaging_size: 'LARGE' } ] }
    const { supplier_id, items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Purchase must contain at least one item' });
    }

    const connection = await pool.getConnection();
    
    try {
        // 1. Start Transaction
        await connection.beginTransaction();

        let total_amount = 0;

        // 2. Insert the main Purchase record first
        const [purchaseResult] = await connection.query(
            'INSERT INTO Purchases (supplier_id, total_amount) VALUES (?, ?)',
            [supplier_id, 0] // Temporary total, we will update it below
        );
        const purchaseId = purchaseResult.insertId;

        // 3. Loop through the items
        for (let item of items) {
            const { fruit_id, quantity, unit_cost, packaging_size } = item;

            // Calculate cost for this item
            const itemTotal = quantity * unit_cost;
            total_amount += itemTotal;

            // Insert into PurchaseDetails
            await connection.query(
                'INSERT INTO PurchaseDetails (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES (?, ?, ?, ?, ?)',
                [purchaseId, fruit_id, quantity, unit_cost, packaging_size]
            );

            // Update the Stock (INCREASE IT)
            // We use "ON DUPLICATE KEY UPDATE" just in case the stock row doesn't exist yet for that size
            await connection.query(
                `INSERT INTO Stock (fruit_id, packaging_size, available_quantity) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE available_quantity = available_quantity + ?`,
                [fruit_id, packaging_size, quantity, quantity]
            );
        }

        // 4. Update the main Purchase record with the calculated total
        await connection.query(
            'UPDATE Purchases SET total_amount = ? WHERE purchase_id = ?',
            [total_amount, purchaseId]
        );

        // 5. Commit the transaction (Save everything)
        await connection.commit();
        res.status(201).json({ 
            message: 'Purchase recorded and stock updated successfully', 
            purchase_id: purchaseId, 
            total_amount: total_amount 
        });

    } catch (error) {
        // If ANYTHING fails, roll back the entire transaction (no partial data saved)
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Failed to record purchase. Transaction rolled back.', details: error.message });
    } finally {
        // Always release the connection back to the pool
        connection.release();
    }
};