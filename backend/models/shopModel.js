const { prisma } = require('../config/db');

const createShopQuery = async (data) => {
  return await prisma.shop.create({ data });
};

const findAllShops = async () => {
  return await prisma.shop.findMany({
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
};

const findShopById = async (id) => {
  return await prisma.shop.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true } } },
  });
};

const updateShopQuery = async (id, data) => {
  return await prisma.shop.update({
    where: { id },
    data,
  });
};

module.exports = { createShopQuery, findAllShops, findShopById, updateShopQuery };
