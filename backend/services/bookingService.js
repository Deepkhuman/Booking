const shopModel = require('../models/shopModel');
const serviceModel = require('../models/serviceModel');
const bookingModel = require('../models/bookingModel');

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const setBusinessHours = async (shopId, ownerId, schedules) => {
  const shop = await shopModel.findShopById(shopId);
  if (!shop || shop.ownerId !== ownerId) throw new Error('Unauthorized');

  const results = [];
  for (const schedule of schedules) {
    const result = await bookingModel.upsertBusinessHours(
      shopId, schedule.dayOfWeek, schedule.openTime, schedule.closeTime
    );
    results.push(result);
  }
  return results;
};

const getAvailability = async (shopId, date, serviceId) => {
  const queryDate = new Date(date);
  const dayOfWeek = queryDate.getUTCDay();

  const hours = await bookingModel.findBusinessHours(shopId, dayOfWeek);
  if (!hours) return []; // Closed

  const service = await serviceModel.findServiceById(serviceId);
  if (!service) throw new Error('Service not found');

  const existingBookings = await bookingModel.findBookingsByDate(shopId, date);

  const availableSlots = [];
  let currentMins = timeToMinutes(hours.openTime);
  const closeMins = timeToMinutes(hours.closeTime);

  while (currentMins + service.duration <= closeMins) {
    const slotStart = currentMins;
    const slotEnd = currentMins + service.duration;
    let hasCollision = false;

    for (let b of existingBookings) {
      if (Math.max(slotStart, timeToMinutes(b.startTime)) < Math.min(slotEnd, timeToMinutes(b.endTime))) {
        hasCollision = true;
        break;
      }
    }

    if (!hasCollision) availableSlots.push(minutesToTime(slotStart));
    currentMins += 30; // 30-min stride
  }

  return availableSlots;
};

const createBooking = async (customerId, shopId, serviceId, date, startTime) => {
  const service = await serviceModel.findServiceById(serviceId);
  if (!service) throw new Error('Service not found');

  const startMins = timeToMinutes(startTime);
  const endMins = startMins + service.duration;
  const endTime = minutesToTime(endMins);

  const existingBookings = await bookingModel.findBookingsByDate(shopId, date);

  for (let b of existingBookings) {
    if (Math.max(startMins, timeToMinutes(b.startTime)) < Math.min(endMins, timeToMinutes(b.endTime))) {
      throw new Error('Collision detected. Slot unavailable.');
    }
  }

  return await bookingModel.createBookingQuery({
    userId: customerId, shopId: Number(shopId), serviceId: Number(serviceId), date, startTime, endTime
  });
};

const getCustomerBookings = async (customerId) => {
  return await bookingModel.findBookingsByUser(customerId);
};

const getShopBookings = async (shopId, ownerId) => {
  const shop = await shopModel.findShopById(shopId);
  if (!shop || shop.ownerId !== ownerId) throw new Error('Unauthorized');

  return await bookingModel.findBookingsByShopId(shopId);
};

const updateBookingStatus = async (bookingId, userId, status) => {
  const booking = await bookingModel.findBookingById(bookingId);

  if (!booking) throw new Error('Booking not found');

  const isOwner = booking.shop.ownerId === userId;
  const isCustomer = booking.userId === userId;

  if (!isOwner && !isCustomer) throw new Error('Unauthorized action');
  if (isCustomer && status !== 'CANCELLED') throw new Error('Customers can only cancel bookings');

  return await bookingModel.updateBookingStatusQuery(bookingId, status);
};

module.exports = {
  setBusinessHours, getAvailability, createBooking, getCustomerBookings, getShopBookings, updateBookingStatus
};
