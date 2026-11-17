const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');

router.post('/', vendorController.createVendor);
router.get('/', vendorController.getAllVendors);
router.get('/search', vendorController.searchVendors); // Must be above /:id if we had one
router.put('/:id', vendorController.updateVendor);

module.exports = router;