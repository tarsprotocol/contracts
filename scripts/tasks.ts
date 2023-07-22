

import { task, types } from "hardhat/config";
import { BigNumber, utils } from "ethers";
import { getPortal } from "./utils/contract-loader";
import { lifiGetCrossChainQuote, lifiGetCrossChainWithExecQuote } from "./tests/helpers";

const BUFFER_SIZE = BigNumber.from("1000")

task("execute-swap", "Execute swap")
    .setAction(async ({}, hre) => {

        let platform = await getPortal(hre, ["Portal"]);
        const {deployer} = platform.signers

        const SOURCE_CHAIN_ID = 137; //polygon
        const REMOTE_CHAIN_ID = 100; //gnosis

        const USDC_SOURCE = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const USDC_REMOTE = "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83";

        const USDT_SOURCE = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
        const USDT_REMOTE = "0x4ECaBa5870353805a9F068101A40E0f32ed605C6"


        const ERC20ABI = [
            "function issue(uint256 _amount) external",
            "function transfer(address _to, uint256 _amount) external returns (bool)",
            "function transferFrom(address _from, address _to, uint256 _amount) external",
            "function approve(address _to, uint256 _amount) external",
            "function allowance(address _from, address _to) external view returns (uint256)",
            "function balanceOf(address _address) external view returns (uint256)",
            "function nonces(address _owner) external view returns (uint256)",
            "function name() external view returns (string memory)",
        ];
      
        const USDTContract = new hre.ethers.Contract(USDT_SOURCE, ERC20ABI, deployer);
        const USDCContract = new hre.ethers.Contract(USDC_SOURCE, ERC20ABI, deployer);


        let resForOtherChain = await lifiGetCrossChainQuote(
            REMOTE_CHAIN_ID,
            SOURCE_CHAIN_ID,
            USDC_REMOTE,
            USDT_SOURCE,
            "0x8A122928a251c43F5C108FaE3B1E8A7A520AD2fA", //portal on remote
            platform.signers.deployer.address,
            "19000000" //19 USDC  => 19 USDT
        );

      let res = await lifiGetCrossChainWithExecQuote(
        SOURCE_CHAIN_ID,
        REMOTE_CHAIN_ID,
        USDC_SOURCE,
        USDC_REMOTE,
        platform.contracts.TarsPortal!.address,

        "0x8A122928a251c43F5C108FaE3B1E8A7A520AD2fA",
        "0x8A122928a251c43F5C108FaE3B1E8A7A520AD2fA", // contract TARS A deployer sur Other Chain?
        "20000000", //20 USDC  => 20 USDT
        resForOtherChain.estimate.approvalAddress,
        resForOtherChain.transactionRequest?.value?.toString() || "0",
        resForOtherChain.transactionRequest!.data!
      );

    //     console.log('approve')
    //   let approve = await USDCContract
    //             .connect(platform.signers.deployer)
    //             .approve(platform.contracts.TarsPortal!.address, res.estimate.fromAmount)
      
    //     await approve.wait()

        console.log('send')
      let tx = await platform.contracts
        .TarsPortal!.connect(platform.signers.deployer)
        .swapAndBridge(
          0,
          USDC_SOURCE,
          res.estimate.approvalAddress,
          USDC_REMOTE,
          res.estimate.fromAmount,
          REMOTE_CHAIN_ID, //Poly
          res.transactionRequest!.data!,
          { value: res.transactionRequest?.value || 0}
        );

      await tx.wait();
    });
