const bookableService = require('../services/bookableService');

const createService = async (req, res) => {
  try {
    if (req.user.role !== 'OWNER') return res.status(403).json({ message: 'Only owners can create services' });

    const { shopId, name, duration, price } = req.body;
    const service = await bookableService.createService(shopId, req.user.id, name, duration, price);
    
    res.status(201).json(service);
  } catch (error) {
    if (error.message === 'Shop not found') return res.status(404).json({ message: error.message });
    if (error.message === 'You can only add services to your own shop') return res.status(403).json({ message: error.message });
    res.status(500).json({ message: error.message });
  }
};

const getServicesByShop = async (req, res) => {
  try {
    const services = await bookableService.getServicesByShop(req.params.shopId);
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createService, getServicesByShop };
