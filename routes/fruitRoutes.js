const express = require('express');
const router = express.Router();
const fruitController = require('../controllers/fruitController');

router.post('/', fruitController.createFruit);
router.get('/', fruitController.getAllFruits);
router.get('/stock', fruitController.getStock);
router.get('/stock/low', fruitController.getLowStock);
router.put('/:id', fruitController.updateFruit);

module.exports = router;