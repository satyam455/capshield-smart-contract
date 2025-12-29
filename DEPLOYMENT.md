# Deployment Guide - Ethereum Sepolia Testnet

This guide explains how to deploy CAPX and ANGEL tokens to Ethereum Sepolia Testnet and interact with them.

## Prerequisites

1. Node.js and npm installed
2. MetaMask wallet configured for Sepolia Testnet
3. Sepolia ETH from Sepolia Faucet

## Setup

### 1. Get Testnet ETH

Visit Sepolia Faucet to get test ETH:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia

### 2. Configure Environment

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_wallet_private_key_here
TREASURY_ADDRESS=0x... # Optional, defaults to deployer
DAO_ADDRESS=0x... # Optional, defaults to deployer
ADMIN_ADDRESS=0x... # Optional, defaults to deployer
```

To export your private key from MetaMask:
1. Open MetaMask
2. Click the three dots menu
3. Account Details > Export Private Key
4. Enter password and copy the key

### 3. Install Dependencies

```bash
npm install
```

## Deployment Steps

### Step 1: Compile Contracts

```bash
npx hardhat compile
```

### Step 2: Deploy to Sepolia Testnet

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

This will:
- Deploy CAPX token (Shield Token)
- Deploy ANGEL token (Community Token)
- Save deployment info to `deployment-sepolia.json`
- Display contract addresses and verification commands

### Step 3: Verify Contracts (Optional)

After deployment, verify contracts on Etherscan:

```bash
# The deploy script will output the exact commands to use
npx hardhat verify --network sepolia <CAPX_ADDRESS> "TREASURY" "DAO" "ADMIN"
npx hardhat verify --network sepolia <ANGEL_ADDRESS> "ADMIN"
```

## Interacting with Contracts

### Check Token Balances

```bash
npx hardhat run scripts/check-balance.js --network sepolia
```

This displays:
- Your ETH balance
- Your CAPX token balance
- Your ANGEL token balance
- Total supply and mintable amounts
- Treasury and DAO addresses

### Mint Tokens

```bash
npx hardhat run scripts/mint-tokens.js --network sepolia
```

Default amounts:
- CAPX: 1,000,000 CAPY
- ANGEL: 5,000,000 SEED

To mint custom amounts:

```bash
CAPX_AMOUNT=500000 ANGEL_AMOUNT=1000000 npx hardhat run scripts/mint-tokens.js --network sepolia
```

To mint to a specific address:

```bash
RECIPIENT=0x... CAPX_AMOUNT=100000 npx hardhat run scripts/mint-tokens.js --network sepolia
```

## Contract Details

### CAPX Token (Shield Token)
- Symbol: CAPY
- Max Supply: 100,000,000 tokens
- Features: 1% burn + 1% treasury fee on transfers
- Roles: TEAM_MINTER, TREASURY_MINTER, DAO_MINTER, PAUSER, ADMIN

### ANGEL Token (Community Token)
- Symbol: SEED
- Max Supply: 10,000,000,000 tokens
- Features: Reward minting with reason tracking
- Roles: REWARD_MINTER, PAUSER, ADMIN

## Sepolia Testnet Configuration

Network Details:
- Network Name: Sepolia Testnet
- RPC URL: https://ethereum-sepolia-rpc.publicnode.com
- Chain ID: 11155111
- Currency Symbol: ETH
- Block Explorer: https://sepolia.etherscan.io

## Add Tokens to MetaMask

After deployment:

1. Open MetaMask
2. Switch to Sepolia Testnet network
3. Click "Import tokens"
4. Enter the contract address (from deployment-sepolia.json)
5. Token symbol and decimals should auto-fill
6. Click "Add Custom Token"

## Troubleshooting

### Insufficient ETH for gas
Get more testnet ETH from the Sepolia faucets listed above

### Nonce too high error
Reset your account in MetaMask:
Settings > Advanced > Clear activity tab data

### Contract not verified
Wait a few minutes after deployment, then run the verify command again

## Useful Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Sepolia Testnet
npx hardhat run scripts/deploy.js --network sepolia

# Check balances
npx hardhat run scripts/check-balance.js --network sepolia

# Mint tokens
npx hardhat run scripts/mint-tokens.js --network sepolia

# Clean artifacts
npx hardhat clean
```

## Security Notes

1. Never commit your `.env` file
2. Use separate wallets for testnet and mainnet
3. The private key in `.env` should be for testnet only
4. For production, use a hardware wallet or multisig
