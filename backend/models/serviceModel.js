const { prisma } = require('../config/db');

const createServiceQuery = async (data) => {
  return await prisma.service.create({ data });
};

const findServicesByShopId = async (shopId) => {
  return await prisma.service.findMany({
    where: { shopId: Number(shopId) }
  });
};

const findServiceById = async (id) => {
  return await prisma.service.findUnique({
    where: { id: Number(id) }
  });
};

module.exports = { createServiceQuery, findServicesByShopId, findServiceById };
