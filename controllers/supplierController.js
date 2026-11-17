const pool = require('../config/db');

// 1. Create a new supplier
exports.createSupplier = async (req, res) => {
    const { business_name, contact_person, phone, province, address } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO Suppliers (business_name, contact_person, phone, province, address) VALUES (?, ?, ?, ?, ?)',
            [business_name, contact_person, phone, province, address]
        );
        res.status(201).json({ message: 'Supplier created successfully', supplier_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Get all suppliers
exports.getAllSuppliers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Suppliers');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Get a single supplier by ID
exports.getSupplierById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM Suppliers WHERE supplier_id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Update a supplier
exports.updateSupplier = async (req, res) => {
    const { id } = req.params;
    const { business_name, contact_person, phone, province, address } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE Suppliers SET business_name = ?, contact_person = ?, phone = ?, province = ?, address = ? WHERE supplier_id = ?',
            [business_name, contact_person, phone, province, address, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Supplier not found' });
        res.status(200).json({ message: 'Supplier updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Delete a supplier
exports.deleteSupplier = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM Suppliers WHERE supplier_id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Supplier not found' });
        res.status(200).json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        // Handle foreign key constraint error (if supplier is linked to purchases)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete supplier because they have associated purchases.' });
        }
        res.status(500).json({ error: error.message });
    }
};