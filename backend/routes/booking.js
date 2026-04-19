const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  setBusinessHours,
  getAvailability,
  createBooking
} = require('../controllers/booking');

// Public route: Get availability slots
router.get('/availability/:shopId', getAvailability);

// Protected routes (Dashboard)
const {
  getCustomerBookings,
  getShopBookings,
  updateBookingStatus
} = require('../controllers/booking');

router.get('/mine', protect, getCustomerBookings);
router.get('/shop/:shopId', protect, getShopBookings);
router.put('/:id/status', protect, updateBookingStatus);

// Protected routes (Core logic)
router.post('/hours/:shopId', protect, setBusinessHours); // For owners to configure hours
router.post('/', protect, createBooking);                 // For customers to book a slot

module.exports = router;
