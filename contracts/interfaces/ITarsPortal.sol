// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

interface ITarsPortal {

    enum BridgeIntegration {
        ChainLink
        Axelar
        Hyperlane
    }

    error NotWhitelistedAddress();

    event AxelarExecutionResult(bool success, bytes returnData);
    event OracleWhitelistChanged(bool whitelisted, address addr);
    event OracleRateChanged(address from, address to, uint256 rate);

    function whitelistOracle(bool _enable, address _addr) external;

    function getOracleRates(
        address[] memory _froms, 
        address[] memory _to
    ) external view returns (uint256[] memory);

    function updateOracleRates(
        address[] memory _froms, 
        address[] memory _to, 
        uint256[] memory _rates
    ) external;


    function swap(
        bool sourceIsVault,
        bool targetIsVault,
        SwapIntegration _route,
        address _sourceAsset,
        address _approvalAddress,
        address _targetAsset,
        uint256 _amount,
        bytes memory _permitParams, 
        bytes calldata _data
    ) external payable;

    function swapAndBridge(
        bool sourceIsVault,
        bool targetIsVault,
        SwapIntegration _route,
        address _sourceAsset,
        address _approvalAddress,
        address _targetAsset,
        uint256 _amount,
        uint256 _targetChain,
        bytes memory _permitParams, 
        bytes calldata _data
    ) external payable;

    function axelarGateway() external view returns (address);
    function setAxelarGateway(address _diamond) external;

   
}