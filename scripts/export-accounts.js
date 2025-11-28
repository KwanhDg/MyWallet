/**
 * Script xuất thông tin tài khoản (địa chỉ, private key) ra file JSON
 * Cách dùng: npx hardhat run scripts/export-accounts.js --network localhost
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("📝 Đang xuất thông tin tài khoản...");
  
  // Lấy danh sách tài khoản (mặc định lấy 10 tài khoản đầu tiên)
  const accounts = await hre.ethers.getSigners();
  const exportData = [];
  
  console.log(`🔍 Tìm thấy ${accounts.length} tài khoản`);
  
  // Lấy thông tin từng tài khoản
  for (let i = 0; i < Math.min(10, accounts.length); i++) {
    const account = accounts[i];
    const balance = await hre.ethers.provider.getBalance(account.address);
    
    // Lấy private key (chỉ hoạt động với mạng Hardhat/Anvil)
    const privateKey = await hre.network.provider.send("eth_accounts", [i, 1])
      .then(accounts => hre.network.provider.send("eth_getPrivateKey", [accounts[0]]))
      .catch(() => "Không thể lấy private key");
    
    exportData.push({
      accountId: i,
      address: account.address,
      privateKey: privateKey,
      balance: hre.ethers.formatEther(balance) + " ETH"
    });
    
    console.log(`👤 Tài khoản ${i}: ${account.address} (${hre.ethers.formatEther(balance)} ETH)`);
  }
  
  // Tạo thư mục exports nếu chưa tồn tại
  const exportDir = path.join(__dirname, "..", "exports");
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  // Ghi ra file JSON
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const exportPath = path.join(exportDir, `accounts-${timestamp}.json`);
  
  fs.writeFileSync(
    exportPath,
    JSON.stringify(exportData, null, 2)
  );
  
  console.log(`\n✅ Đã xuất thông tin ${exportData.length} tài khoản vào file:`);
  console.log(exportPath);
  console.log("\n⚠️ CẢNH BÁO: File chứa private key, KHÔNG được chia sẻ hoặc commit lên git!");
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
