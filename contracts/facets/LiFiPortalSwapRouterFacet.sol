// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {UsingDiamondOwner} from "hardhat-deploy/solc_0.8/diamond/UsingDiamondOwner.sol";

import "../interfaces/ILiFiPortalSwapRouter.sol";

import {LibLiFi} from "../libraries/LibLiFi.sol";

import "hardhat/console.sol";

contract LiFiPortalSwapRouterFacet is ILiFiPortalSwapRouter, UsingDiamondOwner {
    using SafeERC20 for IERC20;

    constructor() {}

    event LiFiSetDiamond(address diamond);

    function lifiDiamond() external view returns (address) {
        return LibLiFi.getDiamond();
    }

    function setLiFiDiamond(address _diamond) external onlyOwner {
        LibLiFi.setDiamond(_diamond);
        emit LiFiSetDiamond(_diamond);
    }

    /* 
    function swap(
        SwapIntegration _route,
        address _approvalAddress,
        address _sourceAsset,
        address _targetAsset,
        uint256 _amount,
        bytes calldata _data
    ) external payable {
        IERC20(_sourceAsset).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        address sourceAsset = _sourceAsset;
        uint256 sourceAssetInAmount = _amount;

        console.log("INSIDE");

        if (_route == SwapIntegration.LIFI) {
            LibLiFi.execute(
                sourceAsset,
                _approvalAddress,
                sourceAssetInAmount,
                _data
            );
        }

        uint256 remainingBalance = IERC20(sourceAsset).balanceOf(address(this));
        console.log("remainingBalance", remainingBalance);
        if (remainingBalance > 0) {
            IERC20(sourceAsset).safeTransfer(msg.sender, remainingBalance);
        }
    } */
    function swap(
        SwapIntegration _route,
        address _approvalAddress,
        address _sourceAsset,
        address _targetAsset,
        uint256 _amount,
        bytes calldata _data
    ) external payable {
        IERC20(_sourceAsset).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        address sourceAsset = _sourceAsset;
        uint256 sourceAssetInAmount = _amount;

        if (_route == SwapIntegration.LIFI) {
            LibLiFi.execute(
                sourceAsset,
                _approvalAddress,
                sourceAssetInAmount,
                _data
            );
        }

        uint256 assetOutAmount = IERC20(_targetAsset).balanceOf(address(this));
        IERC20(_targetAsset).safeTransfer(msg.sender, assetOutAmount);
    }

    function swapAndBridge(
        SwapIntegration _route,
        address _sourceAsset,
        address _approvalAddress,
        address _targetAsset,
        uint256 _amount,
        uint256 _targetChain,
        bytes calldata _data
    ) external payable {
        IERC20(_sourceAsset).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );
        address sourceAsset = _sourceAsset;
        uint256 sourceAssetInAmount = _amount;

        if (_route == SwapIntegration.LIFI) {
            LibLiFi.execute(
                sourceAsset,
                _approvalAddress,
                sourceAssetInAmount,
                _data
            );
        }
        console.log("AAAAAAAAAAAAAAAAAAAAAA");

        uint256 remainingBalance = IERC20(sourceAsset).balanceOf(address(this));
        if (remainingBalance > 0) {
            IERC20(sourceAsset).safeTransfer(msg.sender, remainingBalance);
        }
    }

    function lifiBridgeReceiver(
        address _tokenReceived,
        address _sender,
        address _approvalAddress,
        uint256 _sourceAssetInAmount,
        bytes calldata _data
    ) external {
        // Access control?
        //swap and bridge back with the data passed !!

        LibLiFi.execute(
            _tokenReceived,
            _approvalAddress,
            _sourceAssetInAmount,
            _data
        );

        uint256 remainingBalance = IERC20(_tokenReceived).balanceOf(
            address(this)
        );
        console.log("SHOULD BE 0", remainingBalance);
    }
}
