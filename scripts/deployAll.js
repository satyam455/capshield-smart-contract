const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Complete deployment script for ANGEL, CAPX tokens and their vesting contracts
 *
 * This script:
 * 1. Deploys ANGEL token
 * 2. Deploys CAPX token
 * 3. Deploys ANGELVesting contract
 * 4. Deploys CAPXVesting contract
 * 5. Saves all deployment info
 *
 * Usage:
 * npx hardhat run scripts/deployAll.js --network <network>
 */

async function main() {
  console.log("🚀 Starting Complete CAPShield Deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString(), "\n");

  const network = hre.network.name;
  const deploymentInfo = {};

  // ========================================
  // STEP 1: Deploy ANGEL Token
  // ========================================
  console.log("📦 Deploying ANGEL Token...");
  const ANGEL = await hre.ethers.getContractFactory("ANGEL");
  const angelToken = await ANGEL.deploy();
  await angelToken.deployed();

  console.log("✅ ANGEL Token deployed to:", angelToken.address);
  console.log("   Initial Supply:", "10,000,000,000 ANGEL");
  console.log();

  deploymentInfo.ANGELToken = {
    address: angelToken.address,
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    name: "AngleSeed Token",
    symbol: "ANGEL",
    decimals: 18,
    initialSupply: "10000000000000000000000000000", // 10B with 18 decimals
    features: ["Mintable by owner", "Burnable", "No fixed supply"]
  };

  // ========================================
  // STEP 2: Deploy CAPX Token
  // ========================================
  console.log("📦 Deploying CAPX Token...");
  const CAPX = await hre.ethers.getContractFactory("CAPX");
  const capxToken = await CAPX.deploy();
  await capxToken.deployed();

  console.log("✅ CAPX Token deployed to:", capxToken.address);
  console.log("   Total Supply:", "100,000,000 CAPX");
  console.log();

  deploymentInfo.CAPXToken = {
    address: capxToken.address,
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    name: "CAPShield Token",
    symbol: "CAPX",
    decimals: 18,
    totalSupply: "100000000000000000000000000", // 100M with 18 decimals
    features: ["Fixed supply", "Burnable", "No minting after deployment"]
  };

  // ========================================
  // STEP 3: Deploy ANGELVesting
  // ========================================
  console.log("📦 Deploying ANGELVesting...");
  const ANGELVesting = await hre.ethers.getContractFactory("ANGELVesting");
  const angelVesting = await ANGELVesting.deploy(angelToken.address);
  await angelVesting.deployed();

  console.log("✅ ANGELVesting deployed to:", angelVesting.address);
  console.log();

  deploymentInfo.ANGELVesting = {
    address: angelVesting.address,
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    tokenAddress: angelToken.address,
    cliffDuration: "36 months",
    vestingDuration: "50 months",
    totalDuration: "86 months"
  };

  // ========================================
  // STEP 4: Deploy CAPXVesting
  // ========================================
  console.log("📦 Deploying CAPXVesting...");
  const CAPXVesting = await hre.ethers.getContractFactory("CAPXVesting");
  const capxVesting = await CAPXVesting.deploy(capxToken.address);
  await capxVesting.deployed();

  console.log("✅ CAPXVesting deployed to:", capxVesting.address);
  console.log();

  deploymentInfo.CAPXVesting = {
    address: capxVesting.address,
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    tokenAddress: capxToken.address,
    cliffDuration: "36 months",
    vestingDuration: "50 months",
    totalDuration: "86 months"
  };

  // ========================================
  // Save Deployment Info
  // ========================================
  const deploymentInfoPath = path.join(__dirname, "..", "deployment-info.json");
  fs.writeFileSync(
    deploymentInfoPath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployment-info.json\n");

  // ========================================
  // Display Summary
  // ========================================
  console.log("═══════════════════════════════════════════════════");
  console.log("📋 COMPLETE DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);
  console.log();
  console.log("TOKENS:");
  console.log("-------");
  console.log("ANGEL Token:", angelToken.address);
  console.log("  └─ Supply: 10,000,000,000 ANGEL (mintable)");
  console.log();
  console.log("CAPX Token:", capxToken.address);
  console.log("  └─ Supply: 100,000,000 CAPX (fixed)");
  console.log();
  console.log("VESTING CONTRACTS:");
  console.log("------------------");
  console.log("ANGELVesting:", angelVesting.address);
  console.log("  └─ Token:", angelToken.address);
  console.log();
  console.log("CAPXVesting:", capxVesting.address);
  console.log("  └─ Token:", capxToken.address);
  console.log();
  console.log("VESTING PARAMETERS:");
  console.log("-------------------");
  console.log("  - Cliff Period: 36 months");
  console.log("  - Linear Vesting: 50 months");
  console.log("  - Total Duration: 86 months");
  console.log("═══════════════════════════════════════════════════");
  console.log();

  // ========================================
  // Wait for Confirmations & Verification
  // ========================================
  if (network !== "hardhat" && network !== "localhost") {
    console.log("⏳ Waiting for block confirmations...");
    await angelToken.deployTransaction.wait(6);
    await capxToken.deployTransaction.wait(6);
    await angelVesting.deployTransaction.wait(6);
    await capxVesting.deployTransaction.wait(6);
    console.log("✅ Block confirmations complete\n");

    console.log("📝 To verify contracts on Etherscan, run:");
    console.log(`npx hardhat verify --network ${network} ${angelToken.address}`);
    console.log(`npx hardhat verify --network ${network} ${capxToken.address}`);
    console.log(`npx hardhat verify --network ${network} ${angelVesting.address} ${angelToken.address}`);
    console.log(`npx hardhat verify --network ${network} ${capxVesting.address} ${capxToken.address}`);
    console.log();
  }

  console.log("🎉 Complete deployment successful!\n");

  // ========================================
  // Next Steps
  // ========================================
  console.log("⚠️  NEXT STEPS:");
  console.log("1. Transfer ANGEL tokens to ANGELVesting contract");
  console.log("2. Transfer CAPX tokens to CAPXVesting contract");
  console.log("3. Create vesting schedules using createVesting()");
  console.log("4. Verify all contracts on block explorer");
  console.log("5. Transfer ownership to multisig if needed");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
