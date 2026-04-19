const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createService,
  getServicesByShop
} = require('../controllers/service');

// Public route: Get all services for a specific shop
router.get('/shop/:shopId', getServicesByShop);

// Protected route: Create a new service (Owner only)
router.post('/', protect, createService);

module.exports = router;
