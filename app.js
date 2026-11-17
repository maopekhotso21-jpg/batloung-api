const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

// 1. Import Routes
const supplierRoutes = require('./routes/supplierRoutes');
const fruitRoutes = require('./routes/fruitRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const saleRoutes = require('./routes/saleRoutes');       // ADDED SALES
const reportRoutes = require('./routes/reportRoutes');   // ADDED REPORTS

const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// 3. API Routes
app.use('/api/suppliers', supplierRoutes);
app.use('/api/fruits', fruitRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', saleRoutes);                     // ADDED SALES
app.use('/api/reports', reportRoutes);                 // ADDED REPORTS

// 4. Test Route
app.get('/api/test', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS solution');
        res.json({ message: 'Database connected!', result: rows[0].solution });
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// 5. 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// 6. Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server!' });
});

// 7. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});