const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Booking Platform API' });
});

// Auth Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Shop Routes
const shopRoutes = require('./routes/shop');
app.use('/api/shops', shopRoutes);

// Service Routes
const serviceRoutes = require('./routes/service');
app.use('/api/services', serviceRoutes);

// Booking Routes
const bookingRoutes = require('./routes/booking');
app.use('/api/bookings', bookingRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
