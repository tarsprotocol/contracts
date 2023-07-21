import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import { IAxelarPortal__factory } from "../../typechain-types"
import { ethers } from 'hardhat';

const AXELAR_GATEWAY = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE"

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;

  const {diamond, execute} = deployments;
  const {deployer, treasury} = await getNamedAccounts();

  await diamond.deploy('TarsPortalDiamond', {
    from: deployer, // this need to be the deployer for upgrade
    owner: treasury,
    facets: [ //plugin already handle OwnershipFacet DiamondCutFacet DiamondLoupeFacet
        'TarsPortalAxelarFacet',
    ],
    execute: {
        contract: 'TarsPortalInit',
        methodName: 'init',
        args: []
    }
  });

  const AxelarPortal = await deployments.get('TarsPortalDiamond')
  const AxelarPortalContract = IAxelarPortal__factory.connect(AxelarPortal.address, ethers.provider)
  let axelatGateway = await AxelarPortalContract.axelatGateway()

  if(axelatGateway != AXELAR_GATEWAY)
    await execute('TarsPortalDiamond', {
      from: treasury, log: true
    }, 'setAxelarGateway', AXELAR_GATEWAY)
};

export default func;

func.tags = ['Portal'];
func.dependencies = [];
