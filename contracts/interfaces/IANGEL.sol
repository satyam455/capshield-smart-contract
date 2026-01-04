// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IANGEL Interface
 * @dev Interface for the ANGEL (AngleSeed) token contract
 */
interface IANGEL is IERC20 {
    // Custom Errors
    error ZeroAddress();
    error AdminMustBeContract();
    error EmptyReason();
    error ReasonTooLong();
    error ZeroAmount();
    error ExceedsMaxSupply();
    error ArrayLengthMismatch();
    error EmptyArrays();

    // Events
    event RewardMint(address indexed to, uint256 amount, string reason);
    event Mint(address indexed to, uint256 amount, bytes32 indexed mintType);

    // Constants
    function PAUSER_ROLE() external view returns (bytes32);
    function REWARD_MINTER_ROLE() external view returns (bytes32);
    function MAX_SUPPLY() external view returns (uint256);
    function MAX_REASON_LENGTH() external view returns (uint256);

    // State variables
    function totalMinted() external view returns (uint256);

    // Minting functions
    function rewardMint(
        address to,
        uint256 amount,
        string calldata reason
    ) external;

    function batchRewardMint(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata reason
    ) external;

    // Pause functions
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);

    // View functions
    function remainingMintableSupply() external view returns (uint256);
    function canMint(uint256 amount) external view returns (bool);
}
