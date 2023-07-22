import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ILiFiPortalSwapRouter__factory } from "../../typechain-types";
import { ethers, network } from "hardhat";

const LiFiDiamond = "0x9b11bc9FAc17c058CAB6286b0c785bE6a65492EF";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;

  const { diamond, execute } = deployments;
  const { deployer, treasury } = await getNamedAccounts();

  await diamond.deploy("TarsPortalDiamond", {
    from: deployer, // this need to be the deployer for upgrade
    owner: treasury,
    facets: [
      //plugin already handle OwnershipFacet DiamondCutFacet DiamondLoupeFacet
      //  "TarsPortalAxelarFacet",
      "LiFiPortalSwapRouterFacet",
    ],
    execute: {
      contract: "TarsPortalInit",
      methodName: "init",
      args: [],
    },
  });

  const LiFiPortal = await deployments.get("LiFiPortalSwapRouterFacet");
  const LiFiPortalContract = ILiFiPortalSwapRouter__factory.connect(
    LiFiPortal.address,
    ethers.provider
  );

  /* 
  const LiFiPortalContract = await ethers.getContractAt(
    "ILiFiPortalSwapRouter",
    LiFiPortal.address,
    await ethers.getNameSigner()
  ); */
  let liFiDiamond = await LiFiPortalContract.lifiDiamond();

  if (liFiDiamond != LiFiDiamond)
    await execute(
      "TarsPortalDiamond",
      {
        from: treasury,
        log: true,
      },
      "setLiFiDiamond",
      LiFiDiamond
    );
};

export default func;

func.tags = ["Portal"];
func.dependencies = [];
