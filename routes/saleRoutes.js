const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');

router.get('/', saleController.getSales);
router.get('/outstanding', saleController.getOutstandingBalances);
router.get('/:id', saleController.getSaleById);
router.post('/', saleController.createSale);

module.exports = router;