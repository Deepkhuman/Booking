const { prisma } = require('../config/db');

const findBusinessHours = async (shopId, dayOfWeek) => {
  return await prisma.businessHours.findUnique({
    where: { shopId_dayOfWeek: { shopId, dayOfWeek } }
  });
};

const upsertBusinessHours = async (shopId, dayOfWeek, openTime, closeTime) => {
  return await prisma.businessHours.upsert({
    where: { shopId_dayOfWeek: { shopId, dayOfWeek } },
    update: { openTime, closeTime },
    create: { shopId, dayOfWeek, openTime, closeTime },
  });
};

const findBookingsByDate = async (shopId, date) => {
  return await prisma.booking.findMany({
    where: { shopId: Number(shopId), date, status: { not: 'CANCELLED' } }
  });
};

const createBookingQuery = async (data) => {
  return await prisma.booking.create({ data });
};

const findBookingsByUser = async (userId) => {
  return await prisma.booking.findMany({
    where: { userId },
    include: {
      shop: { select: { id: true, name: true, location: true } },
      service: { select: { id: true, name: true, price: true, duration: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
};

const findBookingsByShopId = async (shopId) => {
  return await prisma.booking.findMany({
    where: { shopId: Number(shopId) },
    include: {
      user: { select: { id: true, name: true, email: true } },
      service: { select: { id: true, name: true, price: true } }
    },
    orderBy: { date: 'asc' }
  });
};

const findBookingById = async (id) => {
  return await prisma.booking.findUnique({
    where: { id: Number(id) }, include: { shop: true }
  });
};

const updateBookingStatusQuery = async (id, status) => {
  return await prisma.booking.update({
    where: { id: Number(id) }, data: { status }
  });
};

module.exports = {
  findBusinessHours, upsertBusinessHours, findBookingsByDate, createBookingQuery,
  findBookingsByUser, findBookingsByShopId, findBookingById, updateBookingStatusQuery
};
