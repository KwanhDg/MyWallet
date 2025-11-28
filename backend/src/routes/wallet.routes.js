const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { body } = require('express-validator');

// Tạo ví mới
router.post('/create', walletController.createWallet);

// Import ví từ private key
router.post('/import', 
  [
    body('privateKey').isString().withMessage('Private key không hợp lệ')
  ],
  walletController.importWallet
);

// Lấy thông tin số dư
router.get('/balance/:address', walletController.getBalance);

// Lấy danh sách tài khoản mặc định (từ Hardhat)
router.get('/accounts', walletController.getDefaultAccounts);

module.exports = router;
