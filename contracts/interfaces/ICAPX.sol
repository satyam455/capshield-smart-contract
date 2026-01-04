// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ICAPX Interface
 * @dev Interface for the CAPX (CAPShield) token contract
 */
interface ICAPX is IERC20 {
    // Custom Errors
    error ZeroAddress();
    error AdminMustBeContract();
    error ExceedsMaxSupply();
    error ZeroRevenue();
    error ZeroMarketValue();
    error CalculatedMintIsZero();

    // Events
    event RevenueMint(address indexed to, uint256 amount, uint256 revenue, uint256 marketValue);
    event Mint(address indexed to, uint256 amount, bytes32 indexed mintType);
    event TreasuryFee(address indexed from, address indexed to, uint256 amount);
    event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event DAOAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event ExemptionUpdated(address indexed account, bool isExempt);

    // Constants
    function PAUSER_ROLE() external view returns (bytes32);
    function TEAM_MINTER_ROLE() external view returns (bytes32);
    function TREASURY_MINTER_ROLE() external view returns (bytes32);
    function DAO_MINTER_ROLE() external view returns (bytes32);
    function MAX_SUPPLY() external view returns (uint256);
    function BURN_FEE_PERCENT() external view returns (uint256);
    function TREASURY_FEE_PERCENT() external view returns (uint256);

    // State variables
    function treasuryAddress() external view returns (address);
    function daoAddress() external view returns (address);
    function totalMinted() external view returns (uint256);
    function isExemptFromFees(address account) external view returns (bool);

    // Minting functions
    function teamMint(address to, uint256 amount) external;
    function treasuryMint(address to, uint256 amount) external;
    function daoMint(address to, uint256 amount) external;
    function revenueMint(
        address to,
        uint256 revenue,
        uint256 marketValue
    ) external;

    // Admin functions
    function updateTreasuryAddress(address newTreasury) external;
    function updateDAOAddress(address newDAO) external;
    function setExemption(address account, bool exempt) external;

    // Pause functions
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);

    // View functions
    function remainingMintableSupply() external view returns (uint256);
    function canMint(uint256 amount) external view returns (bool);
}
