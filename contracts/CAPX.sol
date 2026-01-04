// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// CAPX - CAPShield Token (Shield Token)
// ERC20 + AccessControl with advanced features
// Symbol: CAPY
// Hard cap: 100,000,000 tokens
// Features:
// - Role-based minting (Team, Treasury, DAO)
// - Revenue-mint formula hook
// - Transfer hooks: 1% burn, 1% treasury allocation
// - Exemptions for Treasury and DAO
// - Pause + Emergency Stop
// - Multisig admin roles
contract CAPX is ERC20, ERC20Burnable, Pausable, AccessControl {
    // Custom Errors (Gas optimized)
    error ZeroAddress();
    error AdminMustBeContract();
    error ExceedsMaxSupply();
    error ZeroRevenue();
    error ZeroMarketValue();
    error CalculatedMintIsZero();

    // Role definitions
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TEAM_MINTER_ROLE = keccak256("TEAM_MINTER_ROLE");
    bytes32 public constant TREASURY_MINTER_ROLE = keccak256("TREASURY_MINTER_ROLE");
    bytes32 public constant DAO_MINTER_ROLE = keccak256("DAO_MINTER_ROLE");

    // Token parameters
    uint8 private constant _DECIMALS = 18;
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**_DECIMALS; // 100M hard cap

    // Transfer fee parameters
    uint256 public constant BURN_FEE_PERCENT = 1; // 1% burn
    uint256 public constant TREASURY_FEE_PERCENT = 1; // 1% treasury
    uint256 private constant FEE_DENOMINATOR = 100;

    // Important addresses
    address public treasuryAddress;
    address public daoAddress;

    // Total minted tracking (irreversible cap enforcement)
    uint256 public totalMinted;

    // Exemption mapping (named for better readability)
    mapping(address account => bool exempt) public isExemptFromFees;

    // Events
    event RevenueMint(address indexed to, uint256 amount, uint256 revenue, uint256 marketValue);
    event Mint(address indexed to, uint256 amount, bytes32 indexed mintType);
    event TreasuryFee(address indexed from, address indexed to, uint256 amount);
    event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event DAOAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event ExemptionUpdated(address indexed account, bool isExempt);

    // Constructor - initializes with zero supply
    constructor(
        address _treasuryAddress,
        address _daoAddress,
        address _adminAddress
    ) ERC20("CAPShield Token", "CAPY") {
        if (_treasuryAddress == address(0)) revert ZeroAddress();
        if (_daoAddress == address(0)) revert ZeroAddress();
        if (_adminAddress == address(0)) revert ZeroAddress();
        if (!_isContract(_adminAddress)) revert AdminMustBeContract();

        treasuryAddress = _treasuryAddress;
        daoAddress = _daoAddress;

        // Grant roles to admin (multisig)
        _grantRole(DEFAULT_ADMIN_ROLE, _adminAddress);
        _grantRole(PAUSER_ROLE, _adminAddress);
        _grantRole(TEAM_MINTER_ROLE, _adminAddress);
        _grantRole(TREASURY_MINTER_ROLE, _adminAddress);
        _grantRole(DAO_MINTER_ROLE, _adminAddress);

        // Set exemptions for Treasury and DAO
        isExemptFromFees[_treasuryAddress] = true;
        isExemptFromFees[_daoAddress] = true;

        emit ExemptionUpdated(_treasuryAddress, true);
        emit ExemptionUpdated(_daoAddress, true);
    }

    /**
     * @dev Returns decimals
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev Team minting function
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function teamMint(address to, uint256 amount) external onlyRole(TEAM_MINTER_ROLE) whenNotPaused {
        _mintWithCapCheck(to, amount);
        emit Mint(to, amount, TEAM_MINTER_ROLE);
    }

    /**
     * @dev Treasury minting function
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function treasuryMint(address to, uint256 amount) external onlyRole(TREASURY_MINTER_ROLE) whenNotPaused {
        _mintWithCapCheck(to, amount);
        emit Mint(to, amount, TREASURY_MINTER_ROLE);
    }

    /**
     * @dev DAO minting function
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function daoMint(address to, uint256 amount) external onlyRole(DAO_MINTER_ROLE) whenNotPaused {
        _mintWithCapCheck(to, amount);
        emit Mint(to, amount, DAO_MINTER_ROLE);
    }

    /**
     * @dev Revenue-based minting function
     * Formula: amount = revenue / marketValue
     * @param to Recipient address
     * @param revenue Revenue amount (in wei or base units)
     * @param marketValue Current market value per token (in wei or base units)
     */
    function revenueMint(
        address to,
        uint256 revenue,
        uint256 marketValue
    ) external onlyRole(TREASURY_MINTER_ROLE) whenNotPaused {
        if (revenue == 0) revert ZeroRevenue();
        if (marketValue == 0) revert ZeroMarketValue();

        uint256 amount = (revenue * 10**_DECIMALS) / marketValue;
        if (amount == 0) revert CalculatedMintIsZero();

        _mintWithCapCheck(to, amount);

        emit RevenueMint(to, amount, revenue, marketValue);
        emit Mint(to, amount, TREASURY_MINTER_ROLE);
    }

    /**
     * @dev Internal mint function with cap enforcement
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function _mintWithCapCheck(address to, uint256 amount) private {
        if (totalMinted + amount > MAX_SUPPLY) revert ExceedsMaxSupply();

        totalMinted += amount;
        _mint(to, amount);
    }

    /**
     * @dev Override transfer to implement burn and treasury fees
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();

        // Check if sender or recipient is exempt from fees
        if (isExemptFromFees[from] || isExemptFromFees[to]) {
            // Exempt transfer - no fees
            super._transfer(from, to, amount);
        } else {
            // Calculate fees
            uint256 burnAmount = (amount * BURN_FEE_PERCENT) / FEE_DENOMINATOR;
            uint256 treasuryAmount = (amount * TREASURY_FEE_PERCENT) / FEE_DENOMINATOR;
            uint256 recipientAmount = amount - burnAmount - treasuryAmount;

            // Execute transfers
            super._transfer(from, to, recipientAmount); // 98% to recipient

            if (burnAmount > 0) {
                _burn(from, burnAmount); // 1% burn (reduces totalSupply)
            }

            if (treasuryAmount > 0) {
                super._transfer(from, treasuryAddress, treasuryAmount); // 1% to treasury
                emit TreasuryFee(from, treasuryAddress, treasuryAmount);
            }
        }
    }

    /**
     * @dev Update treasury address (admin only)
     * @param newTreasury New treasury address
     */
    function updateTreasuryAddress(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert ZeroAddress();

        address oldTreasury = treasuryAddress;

        // Update exemption
        isExemptFromFees[oldTreasury] = false;
        isExemptFromFees[newTreasury] = true;

        treasuryAddress = newTreasury;

        emit TreasuryAddressUpdated(oldTreasury, newTreasury);
        emit ExemptionUpdated(oldTreasury, false);
        emit ExemptionUpdated(newTreasury, true);
    }

    /**
     * @dev Update DAO address (admin only)
     * @param newDAO New DAO address
     */
    function updateDAOAddress(address newDAO) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newDAO == address(0)) revert ZeroAddress();

        address oldDAO = daoAddress;

        // Update exemption
        isExemptFromFees[oldDAO] = false;
        isExemptFromFees[newDAO] = true;

        daoAddress = newDAO;

        emit DAOAddressUpdated(oldDAO, newDAO);
        emit ExemptionUpdated(oldDAO, false);
        emit ExemptionUpdated(newDAO, true);
    }

    /**
     * @dev Set exemption status for an address (admin only)
     * @param account Address to update
     * @param exempt Exemption status
     */
    function setExemption(address account, bool exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        isExemptFromFees[account] = exempt;
        emit ExemptionUpdated(account, exempt);
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
     * @dev Check if an address is a contract
     * @param account Address to check
     * @return True if the address contains code
     */
    function _isContract(address account) private view returns (bool) {
        return account.code.length > 0;
    }
}
