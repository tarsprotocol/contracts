import { deployments, ethers, network } from "hardhat";
import helpers from "@nomicfoundation/hardhat-network-helpers";
import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import {
  //ILiFiPortalSwapRouter,
  ITarsPlatform,
  getPortal,
} from "../../scripts/utils/contract-loader";
import {
  lifiGetCrossChainQuote,
  lifiGetCrossChainWithExecQuote,
  lifiGetSameChainQuote,
} from "./helpers";
import { keccak256 } from "ethers/lib/utils";

/**
 * Test executed on mainnet fork
 */
const CHAIN_ID = 1;
const OTHER_CHAIN_ID = 137; //polygon
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const OTHER_CHAIN_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const USDT_MINTER = "0xC6CDE7C39eB2f0F0095F41570af89eFC2C1Ea828";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

const LIFI_DIAMOND = "0x9b11bc9FAc17c058CAB6286b0c785bE6a65492EF";

describe("Portal LiFi integration", () => {
  //console.log("===");
  before(async function () {
    const { deployer, treasury, user } = await ethers.getNamedSigners();
    this.deployer = deployer;
    this.treasury = treasury;
    this.user = user;

    await deployments.fixture(["Portal"]);
    //console.log("=================");

    let platform = await getPortal(["Portal"]);

    this.platform = platform;

    /**
     * Mint USDT with the master minter
     */
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [USDT_MINTER],
    });

    await platform.signers.deployer.sendTransaction({
      to: USDT_MINTER,
      value: ethers.utils.parseEther("1"),
    });

    const minter = await ethers.getSigner(USDT_MINTER);

    const abi = [
      "function issue(uint256 _amount) external",
      "function transfer(address _to, uint256 _amount) external returns (bool)",
      "function transferFrom(address _from, address _to, uint256 _amount) external",
      "function approve(address _to, uint256 _amount) external",
      "function balanceOf(address _address) external view returns (uint256)",
      "function nonces(address _owner) external view returns (uint256)",
      "function name() external view returns (string memory)",
    ];

    const USDTContract = new ethers.Contract(USDT, abi, minter);
    const USDCContract = new ethers.Contract(USDC, abi, minter);

    await USDTContract.connect(minter).issue("1000000000"); //mint 1000 USDT
    await USDTContract.connect(minter).transfer(
      platform.signers.deployer.address,
      "1000000000"
    ); //mint 1000 USDT

    this.usdc = USDCContract;
    this.usdt = USDTContract;

    const ERC4626Mock = await ethers.getContractFactory("ERC4626Mock");
    const ERC4626USDC = await ERC4626Mock.deploy(
      "ERC4626: USDC",
      "VUSDC",
      USDC
    );
    const ERC4626USDT = await ERC4626Mock.deploy(
      "ERC4626: USDT",
      "VUSDT",
      USDT
    );

    this.vusdc = ERC4626USDC;
    this.vusdt = ERC4626USDT;

    this.beforeUSDCBalance = BigNumber.from(0);
  });

  describe("Configuration setup", () => {
    it("Only owner can setup the LiFi diamond address", async function () {
      const platform = <ITarsPlatform>this.platform;

      /*       console.log(platform);
      console.log("+++++++++++++++++++++++++++++++++++++");
 */
      await expect(
        platform.contracts
          .TarsPortal!.connect(this.user)
          .setLiFiDiamond(LIFI_DIAMOND)
      ).to.be.revertedWith("Only owner is allowed to perform this action");

      await platform.contracts
        .TarsPortal!.connect(this.treasury)
        .setLiFiDiamond(LIFI_DIAMOND);
    });
  });

  describe("Same chain swaps", () => {
    it("Execute asset to asset swap", async function () {
      const platform = <ITarsPlatform>this.platform;

      let res = await lifiGetSameChainQuote(
        CHAIN_ID,
        USDT,
        USDC,
        platform.contracts.TarsPortal!.address,
        "100000000" //100 USDT  => 100 USDC
      );

      //console.log(res);
      await this.usdt
        .connect(platform.signers.deployer)
        .approve(platform.contracts.TarsPortal!.address, "100000000");
      let tx = await platform.contracts
        .TarsPortal!.connect(platform.signers.deployer)
        .swap(
          0,
          res.estimate.approvalAddress,
          USDT,
          USDC,
          100000000,
          res.transactionRequest!.data!
        );
      await tx.wait();
      //console.log(")))))))))))))))))", res.transactionRequest!.data!);

      let usdcBalance: BigNumber = await this.usdc.balanceOf(
        platform.signers.deployer.address
      );

      console.log(usdcBalance);
      assert(usdcBalance.gt(res.estimate.toAmountMin));

      this.beforeUSDCBalance = this.beforeUSDCBalance.add(
        res.estimate.toAmountMin
      );
    });
  });

  /*   describe("Crosschain swaps", () => {
    it("Execute asset to asset swap", async function () {
      const platform = <ITarsPlatform>this.platform;

      await this.usdt
        .connect(platform.signers.deployer)
        .approve(platform.contracts.TarsPortal!.address, "100000000");

      let res = await lifiGetCrossChainQuote(
        CHAIN_ID,
        OTHER_CHAIN_ID,
        USDT,
        OTHER_CHAIN_USDC,
        platform.contracts.TarsPortal!.address,
        platform.signers.deployer.address,
        "100000000" //100 USDT  => 100 USDC
      );

      let tx = await platform.contracts
        .TarsPortal!.connect(platform.signers.deployer)
        .swapAndBridge(
          0,
          USDT,
          res.estimate.approvalAddress,
          USDC,
          100000000,
          OTHER_CHAIN_ID,
          res.transactionRequest!.data!
        );
      await tx.wait();
    });
  }); */

  describe("Back and forth swap", () => {
    it("Go around between the 2 chains", async function () {
      const platform = <ITarsPlatform>this.platform;

      // GET RES TO SWAP USDC TO USDT ON OTHER CHAIN

      let resForOtherChain = await lifiGetCrossChainQuote(
        OTHER_CHAIN_ID,
        CHAIN_ID,
        OTHER_CHAIN_USDC,
        USDT,
        platform.contracts.TarsPortal!.address,
        platform.signers.deployer.address,
        "80000000" //100 USDC  => 100 USDT
      );
      /* =======================  */
      console.log(resForOtherChain);
      console.log("=====================================================");

      // BRIDGE USDC TO OTHER CHAIN WITH DATA PREVIOUSLY FETCHED

      let res = await lifiGetCrossChainWithExecQuote(
        CHAIN_ID,
        OTHER_CHAIN_ID,
        USDC,
        OTHER_CHAIN_USDC,
        platform.contracts.TarsPortal!.address,

        platform.signers.deployer.address,

        platform.contracts.TarsPortal!.address, // contract TARS A deployer sur Other Chain?
        "90000000", //100 USDC  => 100 USDT
        resForOtherChain.estimate.approvalAddress,
        resForOtherChain.transactionRequest!.data!
      );

      console.log(res);

      console.log("=====================================================");
      await this.usdc
        .connect(platform.signers.deployer)
        .approve(platform.contracts.TarsPortal!.address, "100000000");
      let tx = await platform.contracts
        .TarsPortal!.connect(platform.signers.deployer)
        .swapAndBridge(
          0,
          USDC,
          res.estimate.approvalAddress,
          OTHER_CHAIN_USDC,
          100000000,
          OTHER_CHAIN_ID, //Poly
          res.transactionRequest!.data!
        );
      console.log(")))))))))))))))))", res.transactionRequest!.data!);

      await tx.wait();

      let usdcBalance: BigNumber = await this.usdc.balanceOf(
        platform.signers.deployer.address
      );

      console.log(usdcBalance);
      assert(usdcBalance.gt(res.estimate.toAmountMin));

      this.beforeUSDCBalance = this.beforeUSDCBalance.add(
        res.estimate.toAmountMin
      );
    });
  });
});
