/**
 * Các hàm tiện ích dùng chung cho các script
 */

const fs = require('fs');
const path = require('path');

/**
 * Lấy thông tin deploy từ file
 * @param {string} network - Tên mạng (ví dụ: 'localhost', 'mainnet')
 * @returns {Object} Thông tin deploy
 */
function getDeploymentInfo(network) {
  const deployDir = path.join(__dirname, '..', 'deployments');
  const deployFile = path.join(deployDir, `${network}.json`);
  
  try {
    if (fs.existsSync(deployFile)) {
      return JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    }
  } catch (error) {
    console.error('Lỗi khi đọc file deploy:', error);
  }
  
  return null;
}

/**
 * Định dạng số lớn thành chuỗi dễ đọc
 * @param {BigInt|string} value - Giá trị cần định dạng
 * @param {number} decimals - Số chữ số thập phân
 * @returns {string} Chuỗi đã định dạng
 */
function formatBigNumber(value, decimals = 18) {
  if (!value) return '0';
  
  const str = value.toString().padStart(decimals + 1, '0');
  const integerPart = str.slice(0, -decimals) || '0';
  const decimalPart = str.slice(-decimals).replace(/0+$/, '');
  
  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

/**
 * Đợi một khoảng thời gian (tính bằng mili giây)
 * @param {number} ms - Thời gian chờ (ms)
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Kiểm tra xem một chuỗi có phải là địa chỉ hợp lệ không
 * @param {string} address - Địa chỉ cần kiểm tra
 * @returns {boolean}
 */
function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Định dạng số thành chuỗi có dấu phân cách hàng nghìn
 * @param {number|string} num - Số cần định dạng
 * @returns {string}
 */
function formatNumberWithCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Lấy thời gian hiện tại dưới dạng chuỗi
 * @returns {string}
 */
function getCurrentTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

module.exports = {
  getDeploymentInfo,
  formatBigNumber,
  sleep,
  isValidAddress,
  formatNumberWithCommas,
  getCurrentTime
};
