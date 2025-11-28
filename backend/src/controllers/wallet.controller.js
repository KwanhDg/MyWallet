const { ethers } = require('ethers');
const { provider } = require('../services/blockchain.service');

/**
 * Tạo ví mới ngẫu nhiên
 */
const createWallet = (req, res) => {
  try {
    // Tạo ví mới sử dụng ethers
    const wallet = ethers.Wallet.createRandom();
    
    // Trả về thông tin ví (không nên trả về private key trong môi trường production)
    res.json({
      success: true,
      data: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo ví:', error);
    res.status(500).json({
      success: false,
      error: 'Không thể tạo ví mới',
      details: error.message
    });
  }
};

/**
 * Import ví từ private key
 */
const importWallet = async (req, res) => {
  try {
    const { privateKey } = req.body;
    
    // Kiểm tra private key hợp lệ
    if (!ethers.isHexString(privateKey) || privateKey.length !== 66) {
      return res.status(400).json({
        success: false,
        error: 'Private key không hợp lệ'
      });
    }
    
    // Tạo đối tượng ví từ private key
    const wallet = new ethers.Wallet(privateKey, provider);
    
    res.json({
      success: true,
      data: {
        address: wallet.address,
        // Không trả về private key trong response thực tế
        // Chỉ trả về cho mục đích demo
        privateKey: wallet.privateKey
      }
    });
  } catch (error) {
    console.error('Lỗi khi import ví:', error);
    res.status(500).json({
      success: false,
      error: 'Không thể import ví',
      details: error.message
    });
  }
};

/**
 * Lấy số dư ETH và token của một địa chỉ
 */
const getBalance = async (req, res) => {
  try {
    const { address } = req.params;
    
    // Kiểm tra địa chỉ hợp lệ
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Địa chỉ không hợp lệ'
      });
    }
    
    // Lấy số dư ETH
    const ethBalance = await provider.getBalance(address);
    
    // TODO: Lấy số dư token (sẽ được thêm sau khi có contract token)
    
    res.json({
      success: true,
      data: {
        address,
        ethBalance: ethers.formatEther(ethBalance),
        tokenBalance: '0' // Sẽ cập nhật sau
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy số dư:', error);
    res.status(500).json({
      success: false,
      error: 'Không thể lấy số dư',
      details: error.message
    });
  }
};

/**
 * Lấy danh sách tài khoản mặc định từ Hardhat
 */
const getDefaultAccounts = async (req, res) => {
  try {
    // Lấy danh sách tài khoản từ provider Hardhat
    const accounts = await provider.listAccounts();
    
    // Lấy số dư của từng tài khoản
    const accountsWithBalance = await Promise.all(
      accounts.map(async (address) => {
        const balance = await provider.getBalance(address);
        return {
          address,
          balance: ethers.formatEther(balance)
        };
      })
    );
    
    res.json({
      success: true,
      data: accountsWithBalance
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách tài khoản:', error);
    res.status(500).json({
      success: false,
      error: 'Không thể lấy danh sách tài khoản',
      details: error.message
    });
  }
};

module.exports = {
  createWallet,
  importWallet,
  getBalance,
  getDefaultAccounts
};
