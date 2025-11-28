/**
 * Script lắng nghe các block mới và hiển thị các giao dịch liên quan đến địa chỉ được chỉ định
 * Cách dùng: npx hardhat run scripts/listen-new-blocks.js --network localhost --address <địa_chỉ_của_bạn>
 * Ví dụ: npx hardhat run scripts/listen-new-blocks.js --network localhost --address 0x123...
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");

// Biến lưu trữ các địa chỉ đang được theo dõi
const watchedAddresses = new Set();

// Hàm hiển thị thông tin giao dịch
async function displayTransaction(txHash, address) {
  try {
    const tx = await hre.ethers.provider.getTransaction(txHash);
    if (!tx) return;

    // Kiểm tra xem giao dịch có liên quan đến địa chỉ đang theo dõi không
    const isRelevant = tx.from && tx.from.toLowerCase() === address.toLowerCase() ||
                      tx.to && tx.to.toLowerCase() === address.toLowerCase();
    
    if (isRelevant) {
      console.log("\n🔔 Phát hiện giao dịch liên quan:");
      console.log(`📝 Hash: ${tx.hash}`);
      console.log(`📤 Từ: ${tx.from}`);
      console.log(`📥 Đến: tx.to || 'Hợp đồng'`);
      console.log(`💰 Giá trị: ${hre.ethers.formatEther(tx.value || '0')} ETH`);
      console.log(`⛽ Giá gas: ${hre.ethers.formatUnits(tx.gasPrice || '0', 'gwei')} Gwei`);
      console.log(`🔢 Nonce: ${tx.nonce}`);
      
      // Nếu có dữ liệu giao dịch, hiển thị 100 ký tự đầu tiên
      if (tx.data && tx.data !== '0x') {
        console.log(`📄 Dữ liệu: ${tx.data.substring(0, 100)}...`);
      }
      
      // Lấy thông tin biên lai giao dịch
      const receipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);
      if (receipt) {
        console.log(`✅ Trạng thái: ${receipt.status === 1 ? 'Thành công' : 'Thất bại'}`);
        console.log(`⛽ Đã sử dụng: ${receipt.gasUsed.toString()} gas`);
        
        // Hiển thị sự kiện nếu có
        if (receipt.logs && receipt.logs.length > 0) {
          console.log(`📊 Số sự kiện: ${receipt.logs.length}`);
        }
      }
    }
  } catch (error) {
    console.error("Lỗi khi xử lý giao dịch:", error);
  }
}

// Hàm xử lý block mới
async function processNewBlock(blockNumber, address) {
  try {
    const block = await hre.ethers.provider.getBlock(blockNumber, true);
    if (!block || !block.transactions) return;
    
    console.log(`\n📦 Block #${block.number} (${new Date(block.timestamp * 1000).toLocaleTimeString()})`);
    console.log(`🔗 Hash: ${block.hash}`);
    console.log(`⛏️ Miner: ${block.miner}`);
    console.log(`📊 Số giao dịch: ${block.transactions.length}`);
    
    // Xử lý từng giao dịch trong block
    for (const txHash of block.transactions) {
      await displayTransaction(txHash, address);
    }
  } catch (error) {
    console.error("Lỗi khi xử lý block:", error);
  }
}

async function main() {
  // Lấy tham số từ dòng lệnh
  const args = require('yargs')(process.argv.slice(2))
    .option('address', {
      alias: 'a',
      description: 'Địa chỉ cần theo dõi',
      type: 'string',
      demandOption: true
    })
    .help()
    .alias('help', 'h')
    .argv;

  const watchAddress = args.address.toLowerCase();
  
  // Kiểm tra địa chỉ hợp lệ
  if (!ethers.isAddress(watchAddress)) {
    throw new Error("❌ Địa chỉ không hợp lệ!");
  }
  
  watchedAddresses.add(watchAddress);
  
  console.log("🚀 Bắt đầu lắng nghe các block mới...");
  console.log(`👀 Đang theo dõi địa chỉ: ${watchAddress}`);
  console.log(`🌐 Kết nối tới: ${hre.network.name} (${hre.network.config.chainId || 'local'})`);
  console.log("Nhấn Ctrl + C để dừng\n");
  
  // Lấy số block hiện tại
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  console.log(`🔷 Block hiện tại: #${currentBlock}`);
  
  // Đăng ký sự kiện khi có block mới
  hre.ethers.provider.on("block", (blockNumber) => {
    processNewBlock(blockNumber, watchAddress);
  });
  
  // Xử lý tín hiệu dừng chương trình
  process.on('SIGINT', async () => {
    console.log("\n👋 Dừng lắng nghe...");
    process.exit(0);
  });
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
