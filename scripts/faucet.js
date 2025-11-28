/**
 * Script faucet tự động gửi 10 ETH + 500 HUST cho địa chỉ mới
 * Cách dùng: npx hardhat run scripts/faucet.js --network localhost --address <địa_chỉ_nhận>
 * Ví dụ: npx hardhat run scripts/faucet.js --network localhost --address 0x123...
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const { getDeploymentInfo } = require("./utils");

// Cấu hình faucet
const FAUCET_CONFIG = {
  ETH_AMOUNT: hre.ethers.parseEther("10"),    // 10 ETH
  HUST_AMOUNT: hre.ethers.parseEther("500"),  // 500 HUST
  MAX_ETH_BALANCE: hre.ethers.parseEther("1") // Chỉ gửi nếu số dư < 1 ETH
};

async function main() {
  // Lấy tham số từ dòng lệnh
  const args = require('yargs')(process.argv.slice(2))
    .option('address', {
      alias: 'a',
      description: 'Địa chỉ nhận faucet',
      type: 'string',
      demandOption: true
    })
    .help()
    .alias('help', 'h')
    .argv;

  const recipient = args.address;
  
  // Kiểm tra địa chỉ hợp lệ
  if (!ethers.isAddress(recipient)) {
    throw new Error("❌ Địa chỉ không hợp lệ!");
  }
  
  console.log("🚰 Khởi động HUST Faucet...");
  
  // Lấy tài khoản faucet (mặc định là account[0])
  const [faucet] = await hre.ethers.getSigners();
  console.log(`👤 Địa chỉ faucet: ${faucet.address}`);
  
  // Kiểm tra số dư ETH của faucet
  const faucetBalance = await hre.ethers.provider.getBalance(faucet.address);
  console.log(`💰 Số dư faucet: ${hre.ethers.formatEther(faucetBalance)} ETH`);
  
  if (faucetBalance < FAUCET_CONFIG.ETH_AMOUNT) {
    throw new Error(`❌ Faucet không đủ ETH (cần ${hre.ethers.formatEther(FAUCET_CONFIG.ETH_AMOUNT)} ETH)`);
  }
  
  // Kiểm tra số dư ETH của người nhận
  const recipientEthBalance = await hre.ethers.provider.getBalance(recipient);
  console.log(`💰 Số dư ETH hiện tại của ${recipient}: ${hre.ethers.formatEther(recipientEthBalance)} ETH`);
  
  // Chỉ gửi nếu số dư < 1 ETH
  if (recipientEthBalance >= FAUCET_CONFIG.MAX_ETH_BALANCE) {
    console.log(`ℹ️ Địa chỉ đã có đủ ETH (>= ${hre.ethers.formatEther(FAUCET_CONFIG.MAX_ETH_BALANCE)} ETH), bỏ qua gửi ETH`);
  } else {
    // Gửi ETH
    console.log(`🔄 Đang gửi ${hre.ethers.formatEther(FAUCET_CONFIG.ETH_AMOUNT)} ETH...`);
    const ethTx = await faucet.sendTransaction({
      to: recipient,
      value: FAUCET_CONFIG.ETH_AMOUNT
    });
    
    console.log(`⏳ Đang đợi xác nhận giao dịch ETH: ${ethTx.hash}`);
    await ethTx.wait();
    console.log("✅ Đã gửi ETH thành công!");
  }
  
  // Gửi HUST token nếu có hợp đồng
  try {
    const deployment = getDeploymentInfo(hre.network.name);
    if (!deployment || !deployment.contract) {
      throw new Error("Chưa tìm thấy thông tin deploy HUSTCoin");
    }
    
    // Kết nối tới contract HUSTCoin
    const HUSTCoin = await hre.ethers.getContractFactory("HUSTCoin");
    const hustCoin = HUSTCoin.attach(deployment.contract.address);
    
    // Kiểm tra số dư HUST của người nhận
    const recipientHustBalance = await hustCoin.balanceOf(recipient);
    console.log(`💰 Số dư HUST hiện tại của ${recipient}: ${hre.ethers.formatEther(recipientHustBalance)} HUST`);
    
    if (recipientHustBalance > 0) {
      console.log("ℹ️ Địa chỉ đã có HUST, bỏ qua gửi HUST");
    } else {
      // Gửi HUST
      console.log(`🔄 Đang gửi ${hre.ethers.formatEther(FAUCET_CONFIG.HUST_AMOUNT)} HUST...`);
      const hustTx = await hustCoin.connect(faucet).transfer(recipient, FAUCET_CONFIG.HUST_AMOUNT);
      
      console.log(`⏳ Đang đợi xác nhận giao dịch HUST: ${hustTx.hash}`);
      await hustTx.wait();
      console.log("✅ Đã gửi HUST thành công!");
    }
  } catch (error) {
    console.error("⚠️ Không thể gửi HUST:", error.message);
  }
  
  // Hiển thị thông tin số dư mới
  const newEthBalance = await hre.ethers.provider.getBalance(recipient);
  console.log(`\n🎉 Hoàn thành!`);
  console.log(`💰 Số dư ETH mới: ${hre.ethers.formatEther(newEthBalance)} ETH`);
  
  try {
    const hustCoin = await hre.ethers.getContractAt("HUSTCoin", deployment.contract.address);
    const newHustBalance = await hustCoin.balanceOf(recipient);
    console.log(`🪙 Số dư HUST mới: ${hre.ethers.formatEther(newHustBalance)} HUST`);
  } catch (e) {
    // Bỏ qua nếu không lấy được số dư HUST
  }
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
