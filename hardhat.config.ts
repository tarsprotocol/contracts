import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import

dotenv.config();

import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
//import "@nomiclabs/hardhat-vyper";
import "hardhat-gas-reporter";
//import "hardhat-contract-sizer";
import "hardhat-deploy";
import "./scripts/tasks"
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
    polygon: {
      url: "https://red-flashy-water.matic.discover.quiknode.pro/1ecd71b64355720c20f400cc4c6e6b91428d14c0/",
      chainId: 137,
      accounts:
        process.env.DEPLOYER_PK !== undefined ? [process.env.DEPLOYER_PK] : [],
    },
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts:
        process.env.DEPLOYER_PK !== undefined ? [process.env.DEPLOYER_PK] : [],
    },
    lineaTestnet: {
      url: "https://linea-goerli.infura.io/v3/a0a965b8e76b4e77abf745a72002d7de",
      chainId: 59140,
      accounts:
        process.env.DEPLOYER_PK !== undefined ? [process.env.DEPLOYER_PK] : [],
    },
    gnosis: {
      url: "https://rpc.gnosischain.com",
      chainId: 100,
      accounts:
        process.env.DEPLOYER_PK !== undefined ? [process.env.DEPLOYER_PK] : [],
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
