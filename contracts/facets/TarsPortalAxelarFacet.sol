// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import { UsingDiamondOwner } from "hardhat-deploy/solc_0.8/diamond/UsingDiamondOwner.sol";
import { LibAxelar } from "../libraries/LibAxelar.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import  "@openzeppelin/contracts/interfaces/IERC4626.sol";

import "hardhat/console.sol";

contract TarsPortalAxelarFacet is UsingDiamondOwner {
    using SafeERC20 for IERC20;

    constructor() {}

    error NotApprovedByGateway();

    event AxelarSetGateway(address diamond);
    event AxelarExecutionResult(bool success, bytes returnData);

    struct TarsExecutionPayload {



    }

    function axelarGateway() external view returns (address) {
        return LibAxelar.getGateway();
    }

    function setAxelarGateway(address _diamond) external onlyOwner {
        LibAxelar.setGateway(_diamond);
        emit AxelarSetGateway(_diamond);
    }


    function executeWithToken(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) external {
        bytes32 payloadHash = keccak256(payload);

        if (
            !gateway.validateContractCallAndMint(
                commandId,
                sourceChain,
                sourceAddress,
                payloadHash,
                tokenSymbol,
                amount
            )
        ) revert NotApprovedByGateway();

        TarsExecutionPayload payload = abi.decode(payload, (TarsExecutionPayload));


        //Swap 1inch

        //si target chain != current chain rebridge


    }


}
