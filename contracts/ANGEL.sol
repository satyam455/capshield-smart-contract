// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ANGEL - AngleSeed Token (Community Token)
 * @dev ERC20 + AccessControl
 * Symbol: SEED
 * Hard cap: 10,000,000,000 tokens (10B)
 * Features:
 * - Reward mint roles
 * - Hard cap enforcement (irreversible)
 * - Pause support for emergency stop
 * - Multisig admin roles
 * - Burnable tokens
 */
contract ANGEL is ERC20, ERC20Burnable, Pausable, AccessControl {
    // Custom Errors (Gas optimized)
    error ZeroAddress();
    error AdminMustBeContract();
    error EmptyReason();
    error ReasonTooLong();
    error ZeroAmount();
    error ExceedsMaxSupply();
    error ArrayLengthMismatch();
    error EmptyArrays();

    // Role definitions
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant REWARD_MINTER_ROLE = keccak256("REWARD_MINTER_ROLE");

    // Token parameters
    uint8 private constant _DECIMALS = 18;
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10**_DECIMALS; // 10B hard cap
    uint256 public constant MAX_REASON_LENGTH = 256; // Maximum reason string length

    // Total minted tracking (irreversible cap enforcement)
    uint256 public totalMinted;

    // Events
    event RewardMint(address indexed to, uint256 amount, string reason);
    event Mint(address indexed to, uint256 amount, bytes32 indexed mintType);

    /**
     * @dev Constructor - initializes with zero supply
     * @param _adminAddress Multisig admin address
     */
    constructor(address _adminAddress) ERC20("AngleSeed Token", "SEED") {
        if (_adminAddress == address(0)) revert ZeroAddress();
        if (!_isContract(_adminAddress)) revert AdminMustBeContract();

        // Grant roles to admin (multisig)
        _grantRole(DEFAULT_ADMIN_ROLE, _adminAddress);
        _grantRole(PAUSER_ROLE, _adminAddress);
        _grantRole(REWARD_MINTER_ROLE, _adminAddress);
    }

    /**
     * @dev Returns decimals
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev Reward minting function for community rewards
     * @param to Recipient address
     * @param amount Amount to mint
     * @param reason Reason for the reward (e.g., "Community engagement")
     */
    function rewardMint(
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyRole(REWARD_MINTER_ROLE) whenNotPaused {
        if (bytes(reason).length == 0) revert EmptyReason();
        if (bytes(reason).length > MAX_REASON_LENGTH) revert ReasonTooLong();

        _mintWithCapCheck(to, amount);

        emit RewardMint(to, amount, reason);
        emit Mint(to, amount, REWARD_MINTER_ROLE);
    }

    /**
     * @dev Batch reward minting function for multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint
     * @param reason Reason for the rewards
     */
    function batchRewardMint(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyRole(REWARD_MINTER_ROLE) whenNotPaused {
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();
        if (recipients.length == 0) revert EmptyArrays();
        if (bytes(reason).length == 0) revert EmptyReason();
        if (bytes(reason).length > MAX_REASON_LENGTH) revert ReasonTooLong();

        uint256 length = recipients.length;
        for (uint256 i; i < length;) {
            _mintWithCapCheck(recipients[i], amounts[i]);
            emit RewardMint(recipients[i], amounts[i], reason);
            emit Mint(recipients[i], amounts[i], REWARD_MINTER_ROLE);

            unchecked { ++i; }
        }
    }

    /**
     * @dev Internal mint function with cap enforcement
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function _mintWithCapCheck(address to, uint256 amount) private {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (totalMinted + amount > MAX_SUPPLY) revert ExceedsMaxSupply();

        totalMinted += amount;
        _mint(to, amount);
    }

    /**
     * @dev Pause contract (emergency stop)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override to add pause functionality to transfers
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Get remaining mintable supply
     */
    function remainingMintableSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }

    /**
     * @dev Check if minting is still possible
     */
    function canMint(uint256 amount) external view returns (bool) {
        return totalMinted + amount <= MAX_SUPPLY;
    }

    /**
     * @dev Override burn to ensure it doesn't increase mintable cap
     * Note: Burning reduces totalSupply but does NOT reduce totalMinted
     */
    function burn(uint256 amount) public override {
        super.burn(amount);
        // totalMinted remains unchanged - burn does not free up mint capacity
    }

    /**
     * @dev Override burnFrom to ensure it doesn't increase mintable cap
     */
    function burnFrom(address account, uint256 amount) public override {
        super.burnFrom(account, amount);
        // totalMinted remains unchanged - burn does not free up mint capacity
    }

    /**
     * @dev Check if an address is a contract
     * @param account Address to check
     * @return True if the address contains code
     */
    function _isContract(address account) private view returns (bool) {
        return account.code.length > 0;
    }
}
