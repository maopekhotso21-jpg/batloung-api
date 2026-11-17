const pool = require('../config/db');

// 1. Create a new fruit (and initialize stock at 0 for all 3 sizes)
exports.createFruit = async (req, res) => {
    const { fruit_name, description } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Insert the fruit
        const [result] = await connection.query(
            'INSERT INTO Fruits (fruit_name, description, status) VALUES (?, ?, "ACTIVE")',
            [fruit_name, description]
        );
        const fruitId = result.insertId;

        // Automatically create stock records for Small, Medium, Large
        await connection.query(
            'INSERT INTO Stock (fruit_id, packaging_size, available_quantity) VALUES (?, "SMALL", 0), (?, "MEDIUM", 0), (?, "LARGE", 0)',
            [fruitId, fruitId, fruitId]
        );

        await connection.commit();
        res.status(201).json({ message: 'Fruit created and stock initialized', fruit_id: fruitId });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
};

// 2. Get all fruits
exports.getAllFruits = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Fruits');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Update fruit details
exports.updateFruit = async (req, res) => {
    const { id } = req.params;
    const { fruit_name, description, status } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE Fruits SET fruit_name = ?, description = ?, status = ? WHERE fruit_id = ?',
            [fruit_name, description, status, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Fruit not found' });
        res.status(200).json({ message: 'Fruit updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. View stock quantities for each packaging size (JOIN Query)
exports.getStock = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity 
            FROM Fruits f
            JOIN Stock s ON f.fruit_id = s.fruit_id
            ORDER BY f.fruit_name, s.packaging_size
        `);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Identify fruits with low stock (e.g., less than 10 boxes)
exports.getLowStock = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT f.fruit_name, s.packaging_size, s.available_quantity 
            FROM Fruits f
            JOIN Stock s ON f.fruit_id = s.fruit_id
            WHERE s.available_quantity < 10
            ORDER BY s.available_quantity ASC
        `);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};