require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true,
      mining: {
        auto: true,
        interval: 2000
    },
    // Dòng này cực kỳ quan trọng để getHistory hoạt động!
    accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20
    }
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    }
  },
  paths: {
    artifacts: "./backend/artifacts",
    cache: "./backend/cache",
    sources: "./contracts",
  },
};
