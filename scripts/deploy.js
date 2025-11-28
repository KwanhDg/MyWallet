/**
 * Script deploy HUSTCoin lên mạng Hardhat local
 * Chạy: npx hardhat run scripts/deploy.js --network localhost
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Bắt đầu deploy HUSTCoin...");
  
  // Lấy tài khoản deploy (mặc định là account[0])
  const [deployer] = await hre.ethers.getSigners();
  console.log(`🔑 Địa chỉ deploy: ${deployer.address}`);
  
  // Kiểm tra số dư
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Số dư: ${hre.ethers.formatEther(balance)} ETH`);
  
  // Deploy contract HUSTCoin
  console.log("🚀 Đang deploy HUSTCoin...");
  const HUSTCoin = await hre.ethers.getContractFactory("HUSTCoin");
  const hustCoin = await HUSTCoin.deploy();
  
  // Đợi deploy xong
  await hustCoin.waitForDeployment();
  
  console.log(`✅ HUSTCoin deployed to: ${await hustCoin.getAddress()}`);
  console.log(`🔗 Xem trên Hardhat Explorer: https://hardhat-explorer.localhost/address/${await hustCoin.getAddress()}`);
  
  // Lưu thông tin deploy ra file
  const contractAddress = await hustCoin.getAddress();
  const deployInfo = {
    network: hre.network.name,
    contract: {
      name: "HUSTCoin",
      address: contractAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      transactionHash: hustCoin.deploymentTransaction().hash
    }
  };
  
  const deployDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deployDir, `${hre.network.name}.json`),
    JSON.stringify(deployInfo, null, 2)
  );
  
  console.log("📝 Thông tin deploy đã được lưu vào thư mục deployments/");
  
  // In ra lệnh để cập nhật biến môi trường
  console.log("\n📌 Cập nhật biến môi trường trong file .env:");
  console.log(`HUSTCOIN_ADDRESS=${contractAddress}`);
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
