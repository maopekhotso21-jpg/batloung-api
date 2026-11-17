const pool = require('../config/db');

// 1. Register a new vendor
exports.createVendor = async (req, res) => {
    const { vendor_name, phone_number, location } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO vendors (vendor_name, phone_number, location, registration_date) VALUES (?, ?, ?, CURDATE())',
            [vendor_name, phone_number, location]
        );
        res.status(201).json({ message: 'Vendor registered successfully', vendor_id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Retrieve all vendors
exports.getAllVendors = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vendors');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Search for a vendor by name or phone number
exports.searchVendors = async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: 'Please provide a search query (e.g., ?query=John)' });
    }
    try {
        const [rows] = await pool.query(
            'SELECT * FROM vendors WHERE vendor_name LIKE ? OR phone_number LIKE ?',
            [`%${query}%`, `%${query}%`]
        );
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Update vendor details
exports.updateVendor = async (req, res) => {
    const { id } = req.params;
    const { vendor_name, phone_number, location } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE vendors SET vendor_name = ?, phone_number = ?, location = ? WHERE vendor_id = ?',
            [vendor_name, phone_number, location, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Vendor not found' });
        res.status(200).json({ message: 'Vendor updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};