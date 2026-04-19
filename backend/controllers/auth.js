const authService = require('../services/authService');

const registerUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const userData = await authService.registerUser(email, password, name, role);
    res.status(201).json(userData);
  } catch (error) {
    if (error.message === 'User already exists') {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await authService.loginUser(email, password);
    res.json(userData);
  } catch (error) {
    if (error.message === 'Invalid email or password') {
      res.status(401).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = { registerUser, loginUser };
