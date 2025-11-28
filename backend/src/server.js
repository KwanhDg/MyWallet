require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const walletRoutes = require('./routes/wallet.routes');
const { initHustCoinContract } = require('./services/blockchain.service');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/wallet', walletRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Khởi động server
const startServer = async () => {
  try {
    // Khởi tạo HUSTCoin contract nếu có địa chỉ
    if (process.env.HUSTCOIN_ADDRESS) {
      initHustCoinContract(process.env.HUSTCOIN_ADDRESS);
      console.log(`HUSTCoin contract initialized at ${process.env.HUSTCOIN_ADDRESS}`);
    }
    
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`CORS enabled for: ${process.env.ALLOWED_ORIGINS || 'All origins'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
