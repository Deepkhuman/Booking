const shopModel = require('../models/shopModel');

const createShop = async (name, description, location, ownerId) => {
  return await shopModel.createShopQuery({ name, description, location, ownerId });
};

const getAllShops = async () => {
  return await shopModel.findAllShops();
};

const getShopById = async (shopId) => {
  const shop = await shopModel.findShopById(shopId);
  if (!shop) throw new Error('Shop not found');
  return shop;
};

const updateShop = async (shopId, ownerId, name, description, location) => {
  const shop = await shopModel.findShopById(shopId);
  
  if (!shop) throw new Error('Shop not found');
  if (shop.ownerId !== ownerId) throw new Error('Not authorized to update this shop');

  return await shopModel.updateShopQuery(shopId, {
    name: name || shop.name,
    description: description !== undefined ? description : shop.description,
    location: location !== undefined ? location : shop.location,
  });
};

module.exports = { createShop, getAllShops, getShopById, updateShop };
