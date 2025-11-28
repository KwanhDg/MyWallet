/**
 * Script mint HUSTCoin cho một địa chỉ bất kỳ
 * Cách dùng: npx hardhat run scripts/mint-token.js --network localhost --address <địa_chỉ_nhận> --amount <số_lượng>
 * Ví dụ: npx hardhat run scripts/mint-token.js --network localhost --address 0x123... --amount 1000
 */

const hre = require("hardhat");
const { ethers } = require("hardhat");
const { getDeploymentInfo } = require("./utils");

async function main() {
  // Lấy tham số từ dòng lệnh
  const args = require('yargs')(process.argv.slice(2))
    .option('address', {
      alias: 'a',
      description: 'Địa chỉ nhận token',
      type: 'string',
      demandOption: true
    })
    .option('amount', {
      alias: 'n',
      description: 'Số lượng token cần mint',
      type: 'number',
      default: 1000
    })
    .help()
    .alias('help', 'h')
    .argv;

  const recipient = args.address;
  const amount = args.amount;

  console.log(`🔄 Bắt đầu mint ${amount} HUST cho địa chỉ: ${recipient}`);
  
  // Kiểm tra địa chỉ hợp lệ
  if (!ethers.isAddress(recipient)) {
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
  
  // Lấy tài khoản deploy
  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Đang thực hiện mint từ địa chỉ: ${deployer.address}`);
  
  // Kiểm tra số dư ETH để thực hiện giao dịch
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Số dư ETH của deployer: ${hre.ethers.formatEther(balance)} ETH`);
  
  // Thực hiện mint token
  console.log(`🔄 Đang mint ${amount} HUST cho ${recipient}...`);
  const tx = await hustCoin.connect(deployer).mint(recipient, hre.ethers.parseEther(amount.toString()));
  
  console.log(`⏳ Đang đợi xác nhận giao dịch: ${tx.hash}`);
  const receipt = await tx.wait();
  
  console.log(`✅ Mint thành công!`);
  console.log(`📝 Transaction hash: ${receipt.hash}`);
  
  // Kiểm tra số dư mới
  const newBalance = await hustCoin.balanceOf(recipient);
  console.log(`💰 Số dư HUST mới của ${recipient}: ${hre.ethers.formatEther(newBalance)} HUST`);
}

// Xử lý lỗi
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
