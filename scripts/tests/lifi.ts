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
  console.log("===");
  before(async function () {
    const { deployer, treasury, user } = await ethers.getNamedSigners();
    this.deployer = deployer;
    this.treasury = treasury;
    this.user = user;

    await deployments.fixture(["Portal"]);
    console.log("=================");

    let platform = await getPortal(["Portal"]);

    this.platform = platform;

    /**
     * Mint USDC with the master minter
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

      console.log(await platform.contracts.TarsPortal!.lifiDiamond());
      console.log(platform.contracts.TarsPortal);
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
        "10000000" //10 USDT  => 10 USDC
      );

      console.log(res);
      await this.usdt
        .connect(platform.signers.deployer)
        .approve(platform.contracts.TarsPortal!.address, "10000000");
      let tx = await platform.contracts
        .TarsPortal!.connect(platform.signers.deployer)
        .swapAndBridge(
          0,
          USDT,
          res.estimate.approvalAddress,
          USDC,
          10000000,
          // "0x",
          0,
          res.transactionRequest!.data!
        );
      await tx.wait();
      console.log(")))))))))))))))))");

      let usdcBalance: BigNumber = await this.usdc.balanceOf(
        platform.signers.deployer.address
      );

      console.log(usdcBalance);
      assert(usdcBalance.gt(res.estimate.toAmountMin));

      this.beforeUSDCBalance = this.beforeUSDCBalance.add(
        res.estimate.toAmountMin
      );
    });

    /*     it("Execute asset to asset swap with permit", async function () {
      const platform = <ITarsPlatform>this.platform;

      let usdcAmount = await this.usdc.balanceOf(
        platform.signers.deployer.address
      );

      let deadline = BigNumber.from(Date.now() + 3600);
      let permitSig = await getPermitSignature(
        platform.signers.deployer,
        this.usdc,
        platform.contracts.StrategPortal!.address,
        usdcAmount,
        deadline,
        { chainId: 1, version: "2" }
      );

      const abiCoder = new ethers.utils.AbiCoder();
      let permitParameters = abiCoder.encode(
        ["tuple(uint256 deadline, uint8 v, bytes32 r, bytes32 s)"],
        [
          {
            deadline,
            v: permitSig.v,
            r: permitSig.r,
            s: permitSig.s,
          },
        ]
      );

      let res = await lifiGetSameChainQuote(
        CHAIN_ID,
        USDC,
        USDT,
        platform.contracts.StrategPortal!.address,
        usdcAmount
      );

      let tx = await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .swap(
          false,
          false,
          0,
          res.estimate.approvalAddress,
          USDC,
          USDT,
          usdcAmount,
          permitParameters,
          res.transactionRequest!.data!
        );
      await tx.wait();

      let usdcBalance: BigNumber = await this.usdc.balanceOf(
        platform.signers.deployer.address
      );
      assert(usdcBalance.eq(0));

      this.beforeUSDCBalance = usdcBalance;
    }); */

    /*     it("Execute vault to asset swap", async function () {
      const platform = <ILiFiPortalSwapRouter>this.platform;

      await this.usdt
        .connect(platform.signers.deployer)
        .approve(this.vusdt.address, "10000000");
      await this.vusdt
        .connect(platform.signers.deployer)
        .deposit("10000000", platform.signers.deployer.address);
      await this.vusdt
        .connect(platform.signers.deployer)
        .approve(platform.contracts.StrategPortal!.address, "10000000");

      let res = await lifiGetSameChainQuote(
        CHAIN_ID,
        USDT,
        USDC,
        platform.contracts.StrategPortal!.address,
        "10000000" //10 USDT  => 10 USDC
      );

      let tx = await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .swap(
          true,
          false,
          0,
          res.estimate.approvalAddress,
          this.vusdt.address,
          USDC,
          10000000,
          "0x",
          res.transactionRequest!.data!
        );
      await tx.wait();

      let usdcBalance: BigNumber = await this.usdc.balanceOf(
        platform.signers.deployer.address
      );

      assert(
        usdcBalance.sub(this.beforeUSDCBalance).gt(res.estimate.toAmountMin)
      );
    });

    it("Execute vault to vault swap", async function () {
      const platform = <ILiFiPortalSwapRouter>this.platform;

      await this.usdt
        .connect(platform.signers.deployer)
        .approve(this.vusdt.address, "10000000");
      await this.vusdt
        .connect(platform.signers.deployer)
        .deposit("10000000", platform.signers.deployer.address);
      await this.vusdt
        .connect(platform.signers.deployer)
        .approve(platform.contracts.StrategPortal!.address, "10000000");
      let res = await lifiGetSameChainQuote(
        CHAIN_ID,
        USDT,
        USDC,
        platform.contracts.StrategPortal!.address,
        "10000000" //10 USDT  => 10 USDC
      );

      let tx = await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .swap(
          true,
          true,
          0,
          res.estimate.approvalAddress,
          this.vusdt.address,
          this.vusdc.address,
          10000000,
          "0x",
          res.transactionRequest!.data!
        );
      await tx.wait();

      let vusdcBalance: BigNumber = await this.vusdc.balanceOf(
        platform.signers.deployer.address
      );
      assert(vusdcBalance.gt(res.estimate.toAmountMin));
    });

    it("Execute vault to vault swap with permit", async function () {
      const platform = <ILiFiPortalSwapRouter>this.platform;

      let usdcVaultAmount = await this.vusdc.balanceOf(
        platform.signers.deployer.address
      );
      let deadline = BigNumber.from(Date.now() + 3600);
      let permitSig = await ILiFiPortalSwapRouter(
        platform.signers.deployer,
        this.vusdc,
        platform.contracts.StrategPortal!.address,
        usdcVaultAmount,
        deadline,
        { chainId: 1 }
      );

      const abiCoder = new ethers.utils.AbiCoder();
      let permitParameters = abiCoder.encode(
        ["tuple(uint256 deadline, uint8 v, bytes32 r, bytes32 s)"],
        [
          {
            deadline,
            v: permitSig.v,
            r: permitSig.r,
            s: permitSig.s,
          },
        ]
      );

      let res = await lifiGetSameChainQuote(
        CHAIN_ID,
        USDC,
        USDT,
        platform.contracts.StrategPortal!.address,
        usdcVaultAmount //10 USDT  => 10 USDC
      );

      let tx = await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .swap(
          true,
          true,
          0,
          res.estimate.approvalAddress,
          this.vusdc.address,
          this.vusdt.address,
          usdcVaultAmount,
          permitParameters,
          res.transactionRequest!.data!
        );
      await tx.wait();

      let vusdtBalance: BigNumber = await this.vusdt.balanceOf(
        platform.signers.deployer.address
      );
      assert(vusdtBalance.gt(res.estimate.toAmountMin));
    }); */
  });

  /*   describe("Crosschain swaps", () => {
    it("Execute asset to asset swap", async function () {
      const platform = <IStrategPlatform>this.platform;

      await this.usdt
        .connect(platform.signers.deployer)
        .approve(platform.contracts.StrategPortal!.address, "100000000");

      let res = await lifiGetCrossChainQuote(
        CHAIN_ID,
        OTHER_CHAIN_ID,
        USDT,
        OTHER_CHAIN_USDC,
        platform.contracts.StrategPortal!.address,
        platform.signers.deployer.address,
        "100000000" //100 USDT  => 100 USDC
      );

      let tx = await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .swapAndBridge(
          false,
          false,
          0,
          USDT,
          res.estimate.approvalAddress,
          USDC,
          100000000,
          OTHER_CHAIN_ID,
          "0x",
          res.transactionRequest!.data!
        );
      await tx.wait();
    });

    it("Execute vault to asset swap", async function () {
      const platform = <IStrategPlatform>this.platform;

      let res = await lifiGetCrossChainQuote(
        CHAIN_ID,
        OTHER_CHAIN_ID,
        USDT,
        OTHER_CHAIN_USDC,
        platform.contracts.StrategPortal!.address,
        platform.signers.deployer.address,
        "100000000" //100 USDT  => 100 USDC
      );

      await this.usdt
        .connect(platform.signers.deployer)
        .approve(this.vusdt.address, res.estimate.fromAmount);
      await this.vusdt
        .connect(platform.signers.deployer)
        .deposit(res.estimate.fromAmount, platform.signers.deployer.address);

      await this.vusdt
        .connect(platform.signers.deployer)
        .approve(
          platform.contracts.StrategPortal!.address,
          res.estimate.fromAmount
        );
      let tx = await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .swapAndBridge(
          true,
          false,
          0,
          this.vusdt.address,
          res.estimate.approvalAddress,
          USDC,
          res.estimate.fromAmount,
          OTHER_CHAIN_ID,
          "0x",
          res.transactionRequest!.data!,
          { value: res.transactionRequest!.value }
        );
      await tx.wait();
    });

    it("Execute vault to vault swap (sending)", async function () {
      const platform = <IStrategPlatform>this.platform;

      let res = await lifiGetCrossChainWithExecQuote(
        CHAIN_ID,
        OTHER_CHAIN_ID,
        USDT,
        OTHER_CHAIN_USDC,
        platform.contracts.StrategPortal!.address,
        platform.signers.deployer.address,
        platform.contracts.StrategPortal!.address,
        platform.contracts.StrategPortal!.address,
        "100000000" //10 USDT  => 10 USDC
      );

      await this.usdt
        .connect(platform.signers.deployer)
        .approve(this.vusdt.address, res.estimate.fromAmount);
      await this.vusdt
        .connect(platform.signers.deployer)
        .deposit(res.estimate.fromAmount, platform.signers.deployer.address);
      await this.vusdt
        .connect(platform.signers.deployer)
        .approve(
          platform.contracts.StrategPortal!.address,
          res.estimate.fromAmount
        );

      let tx = await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .swapAndBridge(
          true,
          true,
          0,
          this.vusdt.address,
          res.estimate.approvalAddress,
          OTHER_CHAIN_USDC,
          res.estimate.fromAmount,
          OTHER_CHAIN_ID,
          "0x",
          res.transactionRequest!.data!,
          { value: res.transactionRequest!.value }
        );
      await tx.wait();
    });

    it("Execute vault to vault swap with permit (sending)", async function () {
      const platform = <IStrategPlatform>this.platform;

      let res = await lifiGetCrossChainWithExecQuote(
        CHAIN_ID,
        OTHER_CHAIN_ID,
        USDT,
        OTHER_CHAIN_USDC,
        platform.contracts.StrategPortal!.address,
        platform.signers.deployer.address,
        platform.contracts.StrategPortal!.address,
        platform.contracts.StrategPortal!.address,
        "100000000" //10 USDT  => 10 USDC
      );

      await this.usdt
        .connect(platform.signers.deployer)
        .approve(this.vusdt.address, res.estimate.fromAmount);
      await this.vusdt
        .connect(platform.signers.deployer)
        .deposit(res.estimate.fromAmount, platform.signers.deployer.address);

      let deadline = BigNumber.from(Date.now() + 3600);
      let permitSig = await getPermitSignature(
        platform.signers.deployer,
        this.vusdt,
        platform.contracts.StrategPortal!.address,
        res.estimate.fromAmount,
        deadline,
        { chainId: 1 }
      );

      const abiCoder = new ethers.utils.AbiCoder();
      let permitParameters = abiCoder.encode(
        ["tuple(uint256 deadline, uint8 v, bytes32 r, bytes32 s)"],
        [
          {
            deadline,
            v: permitSig.v,
            r: permitSig.r,
            s: permitSig.s,
          },
        ]
      );

      let tx = await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .swapAndBridge(
          true,
          true,
          0,
          this.vusdt.address,
          res.estimate.approvalAddress,

          OTHER_CHAIN_USDC,
          res.estimate.fromAmount,
          OTHER_CHAIN_ID,
          permitParameters,
          res.transactionRequest!.data!,
          { value: res.transactionRequest!.value }
        );
      await tx.wait();
    });

    it("Execute vault to vault swap (receive)", async function () {
      const platform = <IStrategPlatform>this.platform;
      await this.usdt
        .connect(platform.signers.deployer)
        .transfer(platform.contracts.StrategPortal!.address, "100000000");
      await platform.contracts
        .StrategPortal!.connect(platform.signers.deployer)
        .lifiBridgeReceiver(
          this.usdt.address,
          platform.signers.user.address,
          this.vusdt.address
        );

      let vusdtBalance = await this.vusdt.balanceOf(
        platform.signers.user.address
      );
      assert(vusdtBalance.eq("100000000"));
    });
  }); */
});
