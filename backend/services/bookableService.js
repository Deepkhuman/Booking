const shopModel = require('../models/shopModel');
const serviceModel = require('../models/serviceModel');

const createService = async (shopId, ownerId, name, duration, price) => {
  const shop = await shopModel.findShopById(Number(shopId));

  if (!shop) throw new Error('Shop not found');
  if (shop.ownerId !== ownerId) throw new Error('You can only add services to your own shop');

  return await serviceModel.createServiceQuery({ 
    name, 
    duration: Number(duration), 
    price: Number(price), 
    shopId: shop.id 
  });
};

const getServicesByShop = async (shopId) => {
  return await serviceModel.findServicesByShopId(shopId);
};

module.exports = { createService, getServicesByShop };
