const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.post('/', saleController.createSale);
router.get('/outstanding', saleController.getOutstandingBalances);

module.exports = router;