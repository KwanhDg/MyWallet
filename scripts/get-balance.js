/**
 * Script kiểm tra số dư ETH và HUST của một địa chỉ
 * Cách dùng: npx hardhat run scripts/get-balance.js --network localhost --address <địa_chỉ_cần_kiểm_tra>
 * Ví dụ: npx hardhat run scripts/get-balance.js --network localhost --address 0x123...
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const { getDeploymentInfo } = require("./utils");

async function main() {
  // Lấy tham số từ dòng lệnh
  const args = require('yargs')(process.argv.slice(2))
    .option('address', {
      alias: 'a',
      description: 'Địa chỉ cần kiểm tra số dư',
      type: 'string',
      demandOption: true
    })
    .help()
    .alias('help', 'h')
    .argv;

  const address = args.address;

  // Kiểm tra địa chỉ hợp lệ
  if (!ethers.isAddress(address)) {
    throw new Error("❌ Địa chỉ không hợp lệ!");
  }
  
  console.log(`🔍 Đang kiểm tra số dư của địa chỉ: ${address}`);
  
  // Lấy số dư ETH
  const ethBalance = await hre.ethers.provider.getBalance(address);
  console.log(`💰 Số dư ETH: ${hre.ethers.formatEther(ethBalance)} ETH`);
  
  try {
    // Lấy thông tin deploy từ file
    const deployment = getDeploymentInfo(hre.network.name);
    if (deployment && deployment.contract) {
      // Kết nối tới contract HUSTCoin
      const HUSTCoin = await hre.ethers.getContractFactory("HUSTCoin");
      const hustCoin = HUSTCoin.attach(deployment.contract.address);
      
      // Lấy số dư token
      const tokenBalance = await hustCoin.balanceOf(address);
      console.log(`🪙 Số dư HUST: ${hre.ethers.formatEther(tokenBalance)} HUST`);
      console.log(`📌 Địa chỉ HUSTCoin: ${deployment.contract.address}`);
    } else {
      console.log("ℹ️ Chưa tìm thấy thông tin deploy HUSTCoin");
    }
  } catch (error) {
    console.log("ℹ️ Không thể lấy số dư HUST:", error.message);
  }
  
  // Lấy số dư của các token khác nếu có
  console.log("\n✅ Hoàn thành kiểm tra số dư");
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
