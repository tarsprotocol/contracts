// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

interface ITarsPortal {
    enum SwapIntegration {
        LIFI
    }

    error NotWhitelistedAddress();

    event LiFiExecutionResult(bool success, bytes returnData);

    function swap(
        SwapIntegration _route,
        address _approvalAddress,
        address _sourceAsset,
        address _targetAsset,
        uint256 _amount,
        bytes calldata _data
    ) external payable;

    function swapAndBridge(
        SwapIntegration _route,
        address _sourceAsset,
        address _approvalAddress,
        address _targetAsset,
        uint256 _amount,
        uint256 _targetChain,
        bytes calldata _data
    ) external payable;

    function lifiDiamond() external view returns (address);

    function setLiFiDiamond(address _diamond) external;

    function lifiBridgeReceiver(
        address _tokenReceived,
        address _sender,
        address _approvalAddress,
        uint256 _sourceAssetInAmount,
        uint256 _value,
        bytes calldata _data
    ) external;
}
