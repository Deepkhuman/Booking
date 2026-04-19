const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  createShop,
  getShops,
  getShopById,
  updateShop
} = require('../controllers/shop');

// Public routes
router.get('/', getShops);
router.get('/:id', getShopById);

// Protected routes (Owner only)
router.post('/', protect, createShop);
router.put('/:id', protect, updateShop);

module.exports = router;
