/**
 * Script chuyển ETH cho nhiều địa chỉ cùng lúc
 * Cách dùng: npx hardhat run scripts/batch-transfer.js --network localhost --amount <số_lượng_eth_mỗi_địa_chỉ>
 * Ví dụ: npx hardhat run scripts/batch-transfer.js --network localhost --amount 0.1
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  // Lấy tham số từ dòng lệnh
  const args = require('yargs')(process.argv.slice(2))
    .option('amount', {
      alias: 'a',
      description: 'Số lượng ETH cần chuyển cho mỗi địa chỉ',
      type: 'number',
      default: 0.1
    })
    .help()
    .alias('help', 'h')
    .argv;

  const amountPerAddress = args.amount;
  const amountInWei = hre.ethers.parseEther(amountPerAddress.toString());
  
  // Lấy danh sách tài khoản
  const accounts = await hre.ethers.getSigners();
  const sender = accounts[0];
  const recipients = accounts.slice(1, 11); // Lấy 10 địa chỉ đầu tiên
  
  if (recipients.length === 0) {
    throw new Error("❌ Không tìm thấy địa chỉ nhận!");
  }
  
  console.log(`🔄 Bắt đầu chuyển ${amountPerAddress} ETH cho ${recipients.length} địa chỉ...`);
  console.log(`👤 Đang thực hiện giao dịch từ địa chỉ: ${sender.address}`);
  
  // Kiểm tra số dư
  const balance = await hre.ethers.provider.getBalance(sender.address);
  const totalAmount = amountInWei * BigInt(recipients.length);
  
  console.log(`💰 Số dư hiện tại: ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`💸 Tổng số ETH cần chuyển: ${hre.ethers.formatEther(totalAmount)} ETH`);
  
  if (balance < totalAmount) {
    throw new Error("❌ Không đủ số dư để thực hiện giao dịch!");
  }
  
  // Thực hiện chuyển ETH cho từng địa chỉ
  console.log("\n📤 Đang gửi ETH...");
  let successCount = 0;
  const failedAddresses = [];
  
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    try {
      console.log(`  ${i+1}. Đang chuyển đến ${recipient.address}...`);
      const tx = await sender.sendTransaction({
        to: recipient.address,
        value: amountInWei
      });
      
      await tx.wait();
      console.log(`     ✅ Thành công! Tx: ${tx.hash}`);
      successCount++;
    } catch (error) {
      console.error(`     ❌ Lỗi: ${error.message}`);
      failedAddresses.push(recipient.address);
    }
  }
  
  // Tổng kết
  console.log("\n🎉 Hoàn thành!");
  console.log(`✅ Thành công: ${successCount} giao dịch`);
  
  if (failedAddresses.length > 0) {
    console.log(`❌ Thất bại: ${failedAddresses.length} giao dịch`);
    console.log("   Các địa chỉ gặp lỗi:", failedAddresses);
  }
  
  // Kiểm tra số dư mới
  const newBalance = await hre.ethers.provider.getBalance(sender.address);
  console.log(`\n💰 Số dư mới: ${hre.ethers.formatEther(newBalance)} ETH`);
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
