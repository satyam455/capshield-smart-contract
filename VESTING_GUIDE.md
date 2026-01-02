# CAPShield Vesting System Guide

## Overview

The CAPShield vesting system provides secure, transparent token distribution for both ANGEL and CAPX tokens. The system enforces a 36-month cliff followed by 50-month linear vesting, ensuring long-term alignment with project stakeholders.

## Architecture

```
┌────────────────────┐
│   Frontend (UI)    │
│────────────────────│
│ View vesting data  │
│ Claim tokens       │
└─────────┬──────────┘
          │
          │ read / write
          ▼
┌────────────────────┐
│ CapShieldVesting   │
│────────────────────│
│ - vesting logic    │
│ - claim logic      │
│ - admin revoke     │
└─────────┬──────────┘
          │
          │ ERC20 transfer
          ▼
┌────────────────────┐
│ CapShieldToken     │
│ (ERC20, capped)    │
└────────────────────┘
```

### Key Principles

1. **Frontend never mints** - Only reads data and triggers user actions
2. **Vesting never mints** - Only releases pre-allocated tokens
3. **Backend only triggers admin functions** - Cannot bypass smart contract rules
4. **Token contract only transfers** - No vesting logic in token contract

## Vesting Timeline

```
Time ─────────────────────────────────────────────>

|<---- 36 months ---->|<------ 50 months ------>|
|      CLIFF          |     LINEAR VESTING       |
|  claimable = 0      |  gradually increases    |

At:
- now < cliffEnd → 0 tokens
- cliffEnd < now < vestingEnd → partial tokens (linear)
- now >= vestingEnd → 100% tokens
```

## Contracts

### ANGELVesting.sol
Vesting contract for ANGEL tokens (AngleSeed community rewards token)

### CAPXVesting.sol
Vesting contract for CAPX tokens (CAPShield ecosystem token)

## Deployment

### Deploy All Contracts

```bash
# Deploy tokens and vesting contracts
npx hardhat run scripts/deployAll.js --network <network>
```

### Deploy Only Vesting Contracts

```bash
# If tokens are already deployed
npx hardhat run scripts/deployVesting.js --network <network>
```

### Supported Networks

- `sepolia` - Ethereum Sepolia testnet
- `bscTestnet` - BSC testnet
- `mumbai` - Polygon Mumbai testnet

## Setup Instructions

### 1. Deploy Contracts

```bash
npx hardhat run scripts/deployAll.js --network sepolia
```

This deploys:
- ANGEL Token
- CAPX Token
- ANGELVesting contract
- CAPXVesting contract

### 2. Transfer Tokens to Vesting Contracts

```javascript
// Transfer ANGEL tokens to ANGELVesting
await angelToken.transfer(angelVestingAddress, amount);

// Transfer CAPX tokens to CAPXVesting
await capxToken.transfer(capxVestingAddress, amount);
```

### 3. Create Vesting Schedules

```javascript
// Create vesting for a beneficiary
await angelVesting.createVesting(
  beneficiaryAddress,
  ethers.utils.parseEther("1000000") // 1M tokens
);
```

## Frontend Integration

### Core View Functions

#### 1. Get Vesting Details

```javascript
const vesting = await vestingContract.getVesting(userAddress);
/*
Returns:
- totalAllocation: Total tokens allocated
- claimed: Tokens already claimed
- startTime: Vesting start timestamp
- cliffEnd: Cliff end timestamp
- vestingEnd: Vesting end timestamp
- revoked: Whether vesting is revoked
*/
```

**Frontend Display:**
```
Total Allocation: 1,000,000 ANGEL
Claimed: 250,000 ANGEL
Vesting Start: Jan 1, 2024
Cliff Ends: Jan 1, 2027
Fully Vested: Mar 1, 2031
Status: Active
```

#### 2. Get Claimable Amount

```javascript
const claimable = await vestingContract.claimableAmount(userAddress);
```

**Frontend Display:**
```
Available to Claim: 50,000 ANGEL
[Claim Tokens Button]
```

#### 3. Get Locked Amount

```javascript
const locked = await vestingContract.lockedAmount(userAddress);
```

**Frontend Display:**
```
Locked Tokens: 700,000 ANGEL
These tokens will unlock gradually over the next 42 months
```

#### 4. Get Vesting Progress

```javascript
const progress = await vestingContract.vestingProgress(userAddress);
// Returns 0-100
```

**Frontend Display:**
```
Vesting Progress: 35%
[████████████░░░░░░░░░░░░░░░░░] 35%
```

#### 5. Get Weeks Remaining

```javascript
const weeks = await vestingContract.weeksLeft(userAddress);
```

**Frontend Display:**
```
Time Remaining: 182 weeks (3.5 years)
```

#### 6. Get Next Unlock Time

```javascript
const nextUnlock = await vestingContract.nextUnlockTime(userAddress);
```

**Frontend Display:**
```
Next Unlock: Continuous (currently vesting)
Next Unlock: Jan 1, 2027 (cliff end)
```

### User Actions

#### Claim Tokens

```javascript
// Enable button only when claimableAmount > 0
const tx = await vestingContract.claim();
await tx.wait();
```

**Frontend Flow:**
1. Check `claimableAmount(user)`
2. If > 0, enable "Claim" button
3. User clicks "Claim"
4. Call `claim()` function
5. Show transaction confirmation
6. Update UI with new balances

## Admin Operations

### Create Vesting

```javascript
await vestingContract.createVesting(
  beneficiaryAddress,
  ethers.utils.parseEther("1000000")
);
```

**When to use:**
- New investor joins
- Employee stock options
- Community rewards allocation

### Revoke Vesting

```javascript
await vestingContract.revoke(beneficiaryAddress);
```

**What happens:**
- Claimed tokens remain with beneficiary
- Unvested tokens return to owner
- Vesting marked as revoked
- No future claims possible

**When to use:**
- Compliance issues
- User disconnect/ban
- Contract termination

## Events

### VestingCreated

```solidity
event VestingCreated(
  address indexed beneficiary,
  uint256 totalAllocation,
  uint256 startTime,
  uint256 cliffEnd,
  uint256 vestingEnd
);
```

### TokensClaimed

```solidity
event TokensClaimed(
  address indexed beneficiary,
  uint256 amount,
  uint256 totalClaimed
);
```

### VestingRevoked

```solidity
event VestingRevoked(
  address indexed beneficiary,
  uint256 amountClaimed,
  uint256 amountRevoked
);
```

## Security Features

### Smart Contract Level

1. **No Minting** - Vesting contracts never mint tokens
2. **Immutable Allocation** - Once set, allocation cannot be increased
3. **Claimed Tracking** - Prevents double claiming
4. **Reentrancy Protection** - Uses OpenZeppelin ReentrancyGuard
5. **Time-Based Logic** - All vesting calculations based on block.timestamp
6. **Pausable** - Emergency pause functionality

### Architecture Level

1. **Multisig Admin** - Owner should be a multisig wallet
2. **Pause Support** - Admin can pause claims in emergency
3. **Backend Cannot Bypass** - All rules enforced on-chain
4. **Pull-Based Claims** - Users control when to claim

## Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/ANGELVesting.test.js
npx hardhat test test/CAPXVesting.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

## Example Usage Scenarios

### Scenario 1: New Investor

**Backend Flow:**
1. Investor invests off-chain
2. Backend records investment
3. Admin mints/allocates tokens
4. Tokens transferred to vesting contract
5. Call `createVesting(investor, allocation)`
6. Event emitted and indexed
7. Frontend shows vesting entry

### Scenario 2: User Claims Tokens

**User Flow:**
1. User opens dashboard
2. Frontend calls `claimableAmount(user)`
3. If > 0, "Claim" button enabled
4. User clicks "Claim"
5. Transaction sent to blockchain
6. Tokens transferred to user wallet
7. UI updates with new balances

### Scenario 3: Compliance Revoke

**Admin Flow:**
1. Compliance decision made
2. Admin calls `revoke(user)`
3. Claimed tokens stay with user
4. Unvested tokens return to treasury
5. Event emitted
6. Frontend shows "Revoked" status

## Future Extensions (Roadmap)

### Stake While Vesting

```javascript
// Future feature
locked = lockedAmount(user);
stakingContract.stake(locked); // Non-transferable stake
```

### Yield Strategies

```javascript
// Future feature
vestingContract.delegateToStrategy(strategyAddress);
// Locked tokens earn yield while remaining locked
```

### Governance Power

```javascript
// Future feature
locked = lockedAmount(user);
votingPower = locked; // Locked tokens provide voting rights
```

## Common Issues & Solutions

### Issue: "No tokens to claim"

**Cause:** Either before cliff or no claimable amount
**Solution:** Wait until cliff period ends or more time passes

### Issue: "Vesting revoked"

**Cause:** Admin has revoked vesting
**Solution:** Contact support, no further claims possible

### Issue: "Insufficient tokens in contract"

**Cause:** Vesting contract doesn't have enough tokens
**Solution:** Admin must transfer tokens to vesting contract first

## Best Practices

### For Admins

1. **Always use multisig** for vesting contract ownership
2. **Transfer tokens first** before creating vesting
3. **Double-check addresses** before creating vesting
4. **Monitor events** for all vesting activities
5. **Keep deployment info** for verification

### For Frontend Developers

1. **Cache vesting data** with reasonable refresh intervals
2. **Show loading states** during blockchain calls
3. **Display clear error messages** for failed transactions
4. **Use event listeners** for real-time updates
5. **Validate inputs** before sending transactions

### For Users

1. **Claim regularly** to avoid large gas fees later
2. **Verify contract addresses** before interacting
3. **Keep private keys secure**
4. **Understand vesting schedule** before investing

## Contract Addresses

See `deployment-info.json` after deployment for contract addresses on each network.

## Support

For issues or questions:
- GitHub: [Your Repository]
- Discord: [Your Discord]
- Email: [Your Email]

## License

MIT License - See LICENSE file for details
