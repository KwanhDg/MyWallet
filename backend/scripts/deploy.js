const hre = require("hardhat");

async function main() {
  // Lấy tài khoản deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy HUSTCoin
  const HUSTCoin = await hre.ethers.getContractFactory("HUSTCoin");
  const hustCoin = await HUSTCoin.deploy();
  await hustCoin.deployed();

  console.log("HUSTCoin deployed to:", hustCoin.address);
  console.log("Deployer's HUST balance:", (await hustCoin.balanceOf(deployer.address)).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
