import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ITarsPortal, ITarsPortal__factory } from "../../typechain-types";
import { ethers, deployments, network, getNamedAccounts } from "hardhat";

interface ITarsPlatform {
  signers: { [key: string]: SignerWithAddress };
  contracts: ITarsContracts;
}

interface ITarsContracts extends ITarsPortalContracts {}

interface ITarsPortalContracts {
  TarsPortal?: ITarsPortal;
}

async function getPortal(tags: string[]): Promise<ITarsPlatform> {
  let platform: ITarsPlatform = {
    contracts: {},
    signers: await ethers.getNamedSigners(),
  };

  if (tags.indexOf("Portal") >= 0) {
    const TarsPortal = await deployments.get("TarsPortalDiamond");

    /*     platform.contracts.TarsPortal = await ethers.getContractAt(
      "ITarsPortal",
      TarsPortal.address
    ); */
    platform.contracts.TarsPortal = ITarsPortal__factory.connect(
      TarsPortal.address,
      platform.signers["deployer"]
    );
  }

  return platform;
}

export { ITarsPlatform, ITarsContracts, getPortal };
