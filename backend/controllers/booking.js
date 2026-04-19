const bookingService = require('../services/bookingService');

const setBusinessHours = async (req, res) => {
  try {
    const hours = await bookingService.setBusinessHours(Number(req.params.shopId), req.user.id, req.body.schedules);
    res.json({ message: 'Business hours updated', hours });
  } catch (error) {
    if (error.message === 'Unauthorized') return res.status(403).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

const getAvailability = async (req, res) => {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) return res.status(400).json({ message: 'date and serviceId are required' });

  try {
    const availableSlots = await bookingService.getAvailability(Number(req.params.shopId), date, serviceId);
    res.json({ availableSlots });
  } catch (error) {
    if (error.message === 'Service not found') return res.status(404).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

const createBooking = async (req, res) => {
  try {
    const { shopId, serviceId, date, startTime } = req.body;
    const booking = await bookingService.createBooking(req.user.id, shopId, serviceId, date, startTime);
    res.status(201).json(booking);
  } catch (error) {
    if (error.message === 'Service not found') return res.status(404).json({ message: error.message });
    if (error.message === 'Collision detected. Slot unavailable.') return res.status(400).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

const getCustomerBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getCustomerBookings(req.user.id);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShopBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getShopBookings(Number(req.params.shopId), req.user.id);
    res.json(bookings);
  } catch (error) {
    if (error.message === 'Unauthorized') return res.status(403).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const updatedBooking = await bookingService.updateBookingStatus(Number(req.params.id), req.user.id, req.body.status);
    res.json(updatedBooking);
  } catch (error) {
    if (error.message === 'Booking not found') return res.status(404).json({ message: error.message });
    if (error.message === 'Unauthorized action' || error.message === 'Customers can only cancel bookings') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  setBusinessHours, getAvailability, createBooking, getCustomerBookings, getShopBookings, updateBookingStatus
};
