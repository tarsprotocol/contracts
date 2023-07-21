// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
/******************************************************************************/
import { IDiamondCut } from "../interfaces/IDiamondCut.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";
// Remember to add the loupe functions from DiamondLoupeFacet to the diamond.
// The loupe functions are required by the EIP2535 Diamonds standard

error AxelarError(bytes _data);
error UnknownAxelarError();

library LibAxelar {
    using SafeERC20 for IERC20;

    bytes32 constant AXELAR_STORAGE_POSITION = keccak256("axelar.tars.io");

    event AxelarExecutionResult(bool success, bytes returnData);

    struct AxelarConfig {
        address gateway;
    }

    struct AxelarStorage {
        AxelarConfig config;
    }

    function AxelarStorage() internal pure returns (AxelarStorage storage ds) {
        bytes32 position = Axelar_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function setAxelarGateway(address _gateway) internal {
        AxelarStorage storage store = AxelarStorage();
        store.config.gateway = _gateway;
    }

    function getAxelarGateway() internal view returns (address) {
        return AxelarStorage().config.gateway;
    }

    function execute(address _sourceAsset, address _approvalAddress, uint256 _amount, bytes calldata _data) internal {
        AxelarStorage storage store = AxelarStorage();
        address AxelarDiamond = store.config.diamond;
        IERC20(_sourceAsset).safeApprove(_approvalAddress, _amount);
        
        (bool success, bytes memory returnData) = AxelarDiamond.call{value: msg.value}(_data);
        if (!success) {
            if (returnData.length == 0) revert UnknownAxelarError();
            assembly {
                revert(add(32, returnData), mload(returnData))
            }
        }

        IERC20(_sourceAsset).safeApprove(AxelarDiamond, 0);
        emit AxelarExecutionResult(success, returnData);
    }

}
