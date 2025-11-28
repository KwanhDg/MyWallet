/**
 * Script chuyển HUSTCoin từ account[0] sang địa chỉ khác
 * Cách dùng: npx hardhat run scripts/transfer-token.js --network localhost --to <địa_chỉ_nhận> --amount <số_lượng_token>
 * Ví dụ: npx hardhat run scripts/transfer-token.js --network localhost --to 0x123... --amount 100
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const { getDeploymentInfo } = require("./utils");

async function main() {
  // Lấy tham số từ dòng lệnh
  const args = require('yargs')(process.argv.slice(2))
    .option('to', {
      alias: 't',
      description: 'Địa chỉ nhận token',
      type: 'string',
      demandOption: true
    })
    .option('amount', {
      alias: 'a',
      description: 'Số lượng token cần chuyển',
      type: 'number',
      default: 100
    })
    .help()
    .alias('help', 'h')
    .argv;

  const toAddress = args.to;
  const amount = args.amount;

  console.log(`🔄 Bắt đầu chuyển ${amount} HUST đến địa chỉ: ${toAddress}`);
  
  // Kiểm tra địa chỉ hợp lệ
  if (!ethers.isAddress(toAddress)) {
    throw new Error("❌ Địa chỉ không hợp lệ!");
  }
  
  // Lấy thông tin deploy từ file
  const deployment = getDeploymentInfo(hre.network.name);
  if (!deployment || !deployment.contract) {
    throw new Error("❌ Chưa tìm thấy thông tin deploy contract. Hãy chạy deploy.js trước!");
  }
  
  // Kết nối tới contract
  const HUSTCoin = await hre.ethers.getContractFactory("HUSTCoin");
  const hustCoin = HUSTCoin.attach(deployment.contract.address);
  
  // Lấy tài khoản gửi (mặc định là account[0])
  const [sender] = await hre.ethers.getSigners();
  console.log(`👤 Đang thực hiện giao dịch từ địa chỉ: ${sender.address}`);
  
  // Kiểm tra số dư token
  const tokenBalance = await hustCoin.balanceOf(sender.address);
  const amountInWei = hre.ethers.parseEther(amount.toString());
  
  console.log(`💰 Số dư HUST hiện tại: ${hre.ethers.formatEther(tokenBalance)} HUST`);
  
  // Kiểm tra đủ số dư
  if (tokenBalance < amountInWei) {
    throw new Error("❌ Không đủ số dư HUST để thực hiện giao dịch!");
  }
  
  // Thực hiện chuyển token
  console.log(`🔄 Đang chuyển ${amount} HUST đến ${toAddress}...`);
  const tx = await hustCoin.connect(sender).transfer(toAddress, amountInWei);
  
  console.log(`⏳ Đang đợi xác nhận giao dịch: ${tx.hash}`);
  const receipt = await tx.wait();
  
  console.log(`✅ Chuyển HUST thành công!`);
  console.log(`📝 Transaction hash: ${receipt.hash}`);
  
  // Kiểm tra số dư mới
  const newBalance = await hustCoin.balanceOf(sender.address);
  console.log(`💰 Số dư HUST mới: ${hre.ethers.formatEther(newBalance)} HUST`);
  
  const recipientBalance = await hustCoin.balanceOf(toAddress);
  console.log(`💰 Số dư HUST của người nhận ${toAddress}: ${hre.ethers.formatEther(recipientBalance)} HUST`);
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
