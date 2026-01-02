// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.19;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/security/Pausable.sol";

// /**
//  * @title ANGELVesting
//  * @dev Vesting contract for ANGEL tokens with cliff and linear vesting
//  *
//  * Architecture:
//  * - Frontend reads vesting data via view functions
//  * - Users claim tokens via pull-based pattern
//  * - Admin can create/revoke vesting schedules
//  * - Contract never mints - only releases pre-allocated tokens
//  *
//  * Vesting Schedule:
//  * - Cliff: 36 months (no tokens claimable)
//  * - Linear Vesting: 50 months after cliff
//  * - Total Duration: 86 months
//  */
// contract ANGELVesting is Ownable, ReentrancyGuard, Pausable {
//     using SafeERC20 for IERC20;

//     // Vesting parameters
//     uint256 public constant CLIFF_DURATION = 36 * 30 days; // 36 months
//     uint256 public constant VESTING_DURATION = 50 * 30 days; // 50 months linear vesting
//     uint256 public constant TOTAL_DURATION = CLIFF_DURATION + VESTING_DURATION; // 86 months

//     // ANGEL token
//     IERC20 public immutable angelToken;

//     // Vesting structure
//     struct Vesting {
//         uint256 totalAllocation;  // Total tokens allocated
//         uint256 claimed;          // Tokens already claimed
//         uint256 startTime;        // Vesting start timestamp
//         uint256 cliffEnd;         // Cliff end timestamp
//         uint256 vestingEnd;       // Vesting end timestamp
//         bool revoked;             // Whether vesting is revoked
//     }

//     // Beneficiary => Vesting
//     mapping(address => Vesting) public vestings;

//     // Events
//     event VestingCreated(
//         address indexed beneficiary,
//         uint256 totalAllocation,
//         uint256 startTime,
//         uint256 cliffEnd,
//         uint256 vestingEnd
//     );

//     event TokensClaimed(
//         address indexed beneficiary,
//         uint256 amount,
//         uint256 totalClaimed
//     );

//     event VestingRevoked(
//         address indexed beneficiary,
//         uint256 amountClaimed,
//         uint256 amountRevoked
//     );

//     /**
//      * @dev Constructor
//      * @param _angelToken Address of ANGEL token contract
//      */
//     constructor(address _angelToken) {
//         require(_angelToken != address(0), "Invalid token address");
//         angelToken = IERC20(_angelToken);
//     }

//     /**
//      * @dev Create vesting schedule for a beneficiary
//      * @param beneficiary Address of the beneficiary
//      * @param allocation Total tokens to vest
//      */
//     function createVesting(
//         address beneficiary,
//         uint256 allocation
//     ) external onlyOwner {
//         require(beneficiary != address(0), "Invalid beneficiary");
//         require(allocation > 0, "Allocation must be > 0");
//         require(vestings[beneficiary].totalAllocation == 0, "Vesting already exists");

//         // Ensure contract has enough tokens
//         require(
//             angelToken.balanceOf(address(this)) >= allocation,
//             "Insufficient tokens in contract"
//         );

//         uint256 startTime = block.timestamp;
//         uint256 cliffEnd = startTime + CLIFF_DURATION;
//         uint256 vestingEnd = startTime + TOTAL_DURATION;

//         vestings[beneficiary] = Vesting({
//             totalAllocation: allocation,
//             claimed: 0,
//             startTime: startTime,
//             cliffEnd: cliffEnd,
//             vestingEnd: vestingEnd,
//             revoked: false
//         });

//         emit VestingCreated(
//             beneficiary,
//             allocation,
//             startTime,
//             cliffEnd,
//             vestingEnd
//         );
//     }

//     /**
//      * @dev Claim vested tokens (pull-based pattern)
//      */
//     function claim() external nonReentrant whenNotPaused {
//         Vesting storage vesting = vestings[msg.sender];

//         require(vesting.totalAllocation > 0, "No vesting found");
//         require(!vesting.revoked, "Vesting revoked");

//         uint256 claimable = claimableAmount(msg.sender);
//         require(claimable > 0, "No tokens to claim");

//         vesting.claimed += claimable;

//         angelToken.safeTransfer(msg.sender, claimable);

//         emit TokensClaimed(msg.sender, claimable, vesting.claimed);
//     }

//     /**
//      * @dev Revoke vesting and return unvested tokens to owner
//      * @param beneficiary Address of beneficiary to revoke
//      */
//     function revoke(address beneficiary) external onlyOwner {
//         Vesting storage vesting = vestings[beneficiary];

//         require(vesting.totalAllocation > 0, "No vesting found");
//         require(!vesting.revoked, "Already revoked");

//         uint256 claimable = claimableAmount(beneficiary);
//         uint256 unvested = vesting.totalAllocation - vesting.claimed - claimable;

//         vesting.revoked = true;

//         if (unvested > 0) {
//             angelToken.safeTransfer(owner(), unvested);
//         }

//         emit VestingRevoked(beneficiary, vesting.claimed, unvested);
//     }

//     /**
//      * @dev Calculate claimable amount for a beneficiary
//      * @param beneficiary Address to check
//      * @return Claimable token amount
//      */
//     function claimableAmount(address beneficiary) public view returns (uint256) {
//         Vesting memory vesting = vestings[beneficiary];

//         if (vesting.totalAllocation == 0 || vesting.revoked) {
//             return 0;
//         }

//         // Before cliff end
//         if (block.timestamp < vesting.cliffEnd) {
//             return 0;
//         }

//         // After vesting end
//         if (block.timestamp >= vesting.vestingEnd) {
//             return vesting.totalAllocation - vesting.claimed;
//         }

//         // During linear vesting period
//         uint256 timeFromCliff = block.timestamp - vesting.cliffEnd;
//         uint256 vestedAmount = (vesting.totalAllocation * timeFromCliff) / VESTING_DURATION;

//         return vestedAmount - vesting.claimed;
//     }

//     /**
//      * @dev Get full vesting details for a beneficiary
//      * @param beneficiary Address to check
//      * @return totalAllocation Total tokens allocated
//      * @return claimed Tokens already claimed
//      * @return startTime Vesting start time
//      * @return cliffEnd Cliff end time
//      * @return vestingEnd Vesting end time
//      * @return revoked Whether vesting is revoked
//      */
//     function getVesting(address beneficiary)
//         external
//         view
//         returns (
//             uint256 totalAllocation,
//             uint256 claimed,
//             uint256 startTime,
//             uint256 cliffEnd,
//             uint256 vestingEnd,
//             bool revoked
//         )
//     {
//         Vesting memory vesting = vestings[beneficiary];
//         return (
//             vesting.totalAllocation,
//             vesting.claimed,
//             vesting.startTime,
//             vesting.cliffEnd,
//             vesting.vestingEnd,
//             vesting.revoked
//         );
//     }

//     /**
//      * @dev Calculate locked (unvested) amount
//      * @param beneficiary Address to check
//      * @return Locked token amount
//      */
//     function lockedAmount(address beneficiary) external view returns (uint256) {
//         Vesting memory vesting = vestings[beneficiary];

//         if (vesting.totalAllocation == 0 || vesting.revoked) {
//             return 0;
//         }

//         uint256 claimable = claimableAmount(beneficiary);
//         return vesting.totalAllocation - vesting.claimed - claimable;
//     }

//     /**
//      * @dev Calculate vesting progress percentage (0-100)
//      * @param beneficiary Address to check
//      * @return Progress percentage
//      */
//     function vestingProgress(address beneficiary) external view returns (uint256) {
//         Vesting memory vesting = vestings[beneficiary];

//         if (vesting.totalAllocation == 0 || vesting.revoked) {
//             return 0;
//         }

//         if (block.timestamp < vesting.cliffEnd) {
//             return 0;
//         }

//         if (block.timestamp >= vesting.vestingEnd) {
//             return 100;
//         }

//         uint256 timeElapsed = block.timestamp - vesting.cliffEnd;
//         return (timeElapsed * 100) / VESTING_DURATION;
//     }

//     /**
//      * @dev Calculate weeks remaining until fully vested
//      * @param beneficiary Address to check
//      * @return Weeks remaining
//      */
//     function weeksLeft(address beneficiary) external view returns (uint256) {
//         Vesting memory vesting = vestings[beneficiary];

//         if (vesting.totalAllocation == 0 || vesting.revoked) {
//             return 0;
//         }

//         if (block.timestamp >= vesting.vestingEnd) {
//             return 0;
//         }

//         uint256 timeRemaining = vesting.vestingEnd - block.timestamp;
//         return timeRemaining / 1 weeks;
//     }

//     /**
//      * @dev Get next unlock time (current time if vesting active, cliff end if before cliff)
//      * @param beneficiary Address to check
//      * @return Next unlock timestamp
//      */
//     function nextUnlockTime(address beneficiary) external view returns (uint256) {
//         Vesting memory vesting = vestings[beneficiary];

//         if (vesting.totalAllocation == 0 || vesting.revoked) {
//             return 0;
//         }

//         if (block.timestamp < vesting.cliffEnd) {
//             return vesting.cliffEnd;
//         }

//         if (block.timestamp >= vesting.vestingEnd) {
//             return vesting.vestingEnd;
//         }

//         return block.timestamp;
//     }

//     /**
//      * @dev Emergency pause (admin only)
//      */
//     function pause() external onlyOwner {
//         _pause();
//     }

//     /**
//      * @dev Unpause (admin only)
//      */
//     function unpause() external onlyOwner {
//         _unpause();
//     }

//     /**
//      * @dev Emergency token recovery (only non-vested tokens)
//      * @param token Token address to recover
//      * @param amount Amount to recover
//      */
//     function recoverTokens(address token, uint256 amount) external onlyOwner {
//         require(token != address(angelToken), "Cannot recover vesting tokens");
//         IERC20(token).safeTransfer(owner(), amount);
//     }
// }
