import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

dotenv.config();

import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
//import "@nomiclabs/hardhat-vyper";
import "hardhat-gas-reporter";
//import "hardhat-contract-sizer";
import "hardhat-deploy";
//import "hardhat-docgen";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      forking: {
        enabled: true,
        url: process.env.ETHEREUM_RPC!,
      },
      chainId: 1,
      live: false,
      saveDeployments: false,
    },
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/sgaUcLMlmHdg9-vzH47QUgLALCXwj4wV",
      chainId: 5,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: "https://polygon-rpc.com",
      chainId: 137,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    fantom: {
      url: "https://rpc.fantom.network",
      chainId: 250,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    avax: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    optimism: {
      url: "https://mainnet.optimism.io",
      chainId: 10,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      url: "https://ethereum.publicnode.com",
      chainId: 1,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },

  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
    treasury: {
      default: 1,
    },
    feeCollector: {
      default: 2,
    },
    strat: {
      default: 3,
    },
    usdc: {
      default: 4,
      mainnet_fork: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      mainnet: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    },
    /**
     * Test users
     */
    harvester: {
      default: 5,
    },
    user: {
      default: 6,
    },
  },

  mocha: {
    bail: false,
    allowUncaught: false,
    require: ["ts-node/register"],
    timeout: 120000,
    reporter: process.env.MOCHA_REPORTER ?? "spec",
    reporterOptions: {
      mochaFile: "testresult.xml",
    },
  },

  paths: {
    deployments: "deployments",
    deploy: "scripts/deploy",
  },

  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
  },
};

export default config;
