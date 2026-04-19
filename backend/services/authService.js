const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (email, password, name, role) => {
  const userExists = await userModel.findUserByEmail(email);
  if (userExists) throw new Error('User already exists');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await userModel.createUser({
    email, password: hashedPassword, name, role: role || 'CUSTOMER'
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user.id, user.role),
  };
};

const loginUser = async (email, password) => {
  const user = await userModel.findUserByEmail(email);

  if (user && (await bcrypt.compare(password, user.password))) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id, user.role),
    };
  } else {
    throw new Error('Invalid email or password');
  }
};

module.exports = { registerUser, loginUser };
