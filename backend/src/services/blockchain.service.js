const { ethers } = require('ethers');
require('dotenv').config();

// Khởi tạo provider kết nối tới Hardhat node
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');

// ABI của HUSTCoin contract (sẽ được cập nhật sau khi biên dịch)
const HUST_COIN_ABI = [
  // ERC20 standard functions
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)'
];

// Biến lưu trữ instance của HUSTCoin contract
let hustCoinContract = null;

/**
 * Khởi tạo HUSTCoin contract
 */
const initHustCoinContract = (contractAddress) => {
  if (!ethers.utils.isAddress(contractAddress)) {
    throw new Error('Địa chỉ hợp đồng không hợp lệ');
  }
  
  hustCoinContract = new ethers.Contract(contractAddress, HUST_COIN_ABI, provider);
  return hustCoinContract;
};

/**
 * Lấy instance của HUSTCoin contract
 */
const getHustCoinContract = () => {
  if (!hustCoinContract) {
    throw new Error('HUSTCoin contract chưa được khởi tạo');
  }
  return hustCoinContract;
};

/**
 * Chuyển đổi đơn vị từ wei sang ether
 */
const formatEther = (wei) => {
  return ethers.utils.formatEther(wei);
};

/**
 * Chuyển đổi đơn vị từ ether sang wei
 */
const parseEther = (ether) => {
  return ethers.utils.parseEther(ether.toString());
};

// Xuất các hàm và biến cần thiết
module.exports = {
  provider,
  initHustCoinContract,
  getHustCoinContract,
  formatEther,
  parseEther
};
