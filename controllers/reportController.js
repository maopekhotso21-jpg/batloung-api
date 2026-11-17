const pool = require('../config/db');

// 1. The five most frequently sold fruits
exports.getTopFruits = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT f.fruit_name, SUM(sd.quantity) AS total_boxes_sold
            FROM SalesDetails sd
            JOIN Fruits f ON sd.fruit_id = f.fruit_id
            GROUP BY f.fruit_id
            ORDER BY total_boxes_sold DESC
            LIMIT 5
        `);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Total sales revenue during a specified date range
exports.getRevenueByDate = async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide startDate and endDate (YYYY-MM-DD)' });
    }
    try {
        const [rows] = await pool.query(`
            SELECT SUM(total_amount) AS total_revenue 
            FROM Sales 
            WHERE sale_date BETWEEN ? AND ?
        `, [startDate, endDate]);
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. The vendor who purchased the highest number of boxes
exports.getTopVendor = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT v.vendor_name, SUM(sd.quantity) AS total_boxes_bought
            FROM SalesDetails sd
            JOIN Sales s ON sd.sale_id = s.sale_id
            JOIN Vendors v ON s.vendor_id = v.vendor_id
            GROUP BY v.vendor_id
            ORDER BY total_boxes_bought DESC
            LIMIT 1
        `);
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Current stock levels for each fruit and packaging size
exports.getCurrentStock = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT f.fruit_name, s.packaging_size, s.available_quantity
            FROM Stock s
            JOIN Fruits f ON s.fruit_id = f.fruit_id
            ORDER BY f.fruit_name, s.packaging_size
        `);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};