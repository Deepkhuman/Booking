const shopService = require('../services/shopService');

const createShop = async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') return res.status(403).json({ message: 'Only owners can create shops' });
    
    const { name, description, location } = req.body;
    const shop = await shopService.createShop(name, description, location, req.user.id);
    res.status(201).json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShops = async (req, res) => {
  try {
    const shops = await shopService.getAllShops();
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getShopById = async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const shop = await shopService.getShopById(shopId);
    res.json(shop);
  } catch (error) {
    if (error.message === 'Shop not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

const updateShop = async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const { name, description, location } = req.body;
    const updatedShop = await shopService.updateShop(shopId, req.user.id, name, description, location);
    res.json(updatedShop);
  } catch (error) {
    if (error.message === 'Shop not found') return res.status(404).json({ message: error.message });
    if (error.message === 'Not authorized to update this shop') return res.status(403).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createShop, getShops, getShopById, updateShop };
