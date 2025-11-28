/**
 * Script chuyển ETH từ account[0] sang địa chỉ khác
 * Cách dùng: npx hardhat run scripts/transfer-eth.js --network localhost --to <địa_chỉ_nhận> --amount <số_lượng_eth>
 * Ví dụ: npx hardhat run scripts/transfer-eth.js --network localhost --to 0x123... --amount 1.5
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Lấy tham số từ dòng lệnh
  const args = require('yargs')(process.argv.slice(2))
    .option('to', {
      alias: 't',
      description: 'Địa chỉ nhận ETH',
      type: 'string',
      demandOption: true
    })
    .option('amount', {
      alias: 'a',
      description: 'Số lượng ETH cần chuyển',
      type: 'number',
      default: 1
    })
    .help()
    .alias('help', 'h')
    .argv;

  const toAddress = args.to;
  const amount = args.amount;

  console.log(`🔄 Bắt đầu chuyển ${amount} ETH đến địa chỉ: ${toAddress}`);
  
  // Kiểm tra địa chỉ hợp lệ
  if (!ethers.isAddress(toAddress)) {
    throw new Error("❌ Địa chỉ không hợp lệ!");
  }
  
  // Lấy tài khoản gửi (mặc định là account[0])
  const [sender] = await hre.ethers.getSigners();
  console.log(`👤 Đang thực hiện giao dịch từ địa chỉ: ${sender.address}`);
  
  // Kiểm tra số dư
  const balance = await hre.ethers.provider.getBalance(sender.address);
  console.log(`💰 Số dư hiện tại: ${hre.ethers.formatEther(balance)} ETH`);
  
  // Kiểm tra đủ số dư
  const amountInWei = hre.ethers.parseEther(amount.toString());
  if (balance < amountInWei) {
    throw new Error("❌ Không đủ số dư để thực hiện giao dịch!");
  }
  
  // Thực hiện chuyển ETH
  console.log(`🔄 Đang chuyển ${amount} ETH đến ${toAddress}...`);
  const tx = await sender.sendTransaction({
    to: toAddress,
    value: amountInWei
  });
  
  console.log(`⏳ Đang đợi xác nhận giao dịch: ${tx.hash}`);
  const receipt = await tx.wait();
  
  console.log(`✅ Chuyển ETH thành công!`);
  console.log(`📝 Transaction hash: ${receipt.hash}`);
  
  // Kiểm tra số dư mới
  const newBalance = await hre.ethers.provider.getBalance(sender.address);
  console.log(`💰 Số dư mới: ${hre.ethers.formatEther(newBalance)} ETH`);
  
  const recipientBalance = await hre.ethers.provider.getBalance(toAddress);
  console.log(`💰 Số dư của người nhận ${toAddress}: ${hre.ethers.formatEther(recipientBalance)} ETH`);
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
