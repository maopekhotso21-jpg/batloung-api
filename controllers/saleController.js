const pool = require('../config/db');

// Record a new sale (Decreases Stock, handles payments)
exports.createSale = async (req, res) => {
    // Expected body: { vendor_id: 1, payment_method: 'Cash', amount_paid: 100.00, items: [ { fruit_id: 1, quantity: 5, unit_price: 20.00, packaging_size: 'LARGE' } ] }
    const { vendor_id, payment_method, amount_paid, items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Sale must contain at least one item' });
    }

    const connection = await pool.getConnection();
    
    try {
        // 1. Start Transaction
        await connection.beginTransaction();

        let total_amount = 0;
        let calculated_items = [];

        // 2. CHECK STOCK FIRST for all items
        for (let item of items) {
            const { fruit_id, quantity, unit_price, packaging_size } = item;

            // Query the stock (Lowercase 'stock')
            const [stockRows] = await connection.query(
                'SELECT available_quantity FROM stock WHERE fruit_id = ? AND packaging_size = ? FOR UPDATE',
                [fruit_id, packaging_size]
            );

            if (stockRows.length === 0) {
                throw new Error(`Stock record not found for fruit ID ${fruit_id}, size ${packaging_size}`);
            }

            const available = stockRows[0].available_quantity;

            // REJECT IF NOT ENOUGH STOCK
            if (available < quantity) {
                throw new Error(`Insufficient stock for fruit ID ${fruit_id} (${packaging_size}). Requested: ${quantity}, Available: ${available}`);
            }

            // Calculate total
            const itemTotal = quantity * unit_price;
            total_amount += itemTotal;
            calculated_items.push(item);
        }

        // 3. Determine payment status
        let payment_status = 'UNPAID';
        if (amount_paid >= total_amount) {
            payment_status = 'PAID';
        } else if (amount_paid > 0) {
            payment_status = 'PARTIALLY_PAID';
        }

        // 4. Insert the Sale record (Lowercase 'sales')
        const [saleResult] = await connection.query(
            'INSERT INTO sales (vendor_id, payment_status, payment_method, amount_paid, total_amount) VALUES (?, ?, ?, ?, ?)',
            [vendor_id, payment_status, payment_method, amount_paid || 0, total_amount]
        );
        const saleId = saleResult.insertId;

        // 5. Insert SalesDetails and REDUCE STOCK (Lowercase 'salesdetails' and 'stock')
        for (let item of calculated_items) {
            const { fruit_id, quantity, unit_price, packaging_size } = item;

            await connection.query(
                'INSERT INTO salesdetails (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
                [saleId, fruit_id, packaging_size, quantity, unit_price]
            );

            // Decrease stock
            await connection.query(
                'UPDATE stock SET available_quantity = available_quantity - ? WHERE fruit_id = ? AND packaging_size = ?',
                [quantity, fruit_id, packaging_size]
            );
        }

        // 6. Commit Transaction
        await connection.commit();
        res.status(201).json({ 
            message: 'Sale recorded successfully', 
            sale_id: saleId, 
            total_amount: total_amount,
            payment_status: payment_status
        });

    } catch (error) {
        // ROLLBACK if any item fails
        await connection.rollback();
        res.status(400).json({ error: error.message }); // 400 Bad Request for insufficient stock
    } finally {
        connection.release();
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