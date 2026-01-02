const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deployment script for ANGEL and CAPX vesting contracts
 *
 * This script:
 * 1. Deploys ANGELVesting contract
 * 2. Deploys CAPXVesting contract
 * 3. Saves deployment info to deployment-info.json
 *
 * Usage:
 * npx hardhat run scripts/deployVesting.js --network <network>
 */

async function main() {
  console.log("🚀 Starting Vesting Contracts Deployment...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString(), "\n");

  // Load existing deployment info if it exists
  const deploymentInfoPath = path.join(__dirname, "..", "deployment-info.json");
  let deploymentInfo = {};

  if (fs.existsSync(deploymentInfoPath)) {
    const data = fs.readFileSync(deploymentInfoPath, "utf8");
    deploymentInfo = JSON.parse(data);
    console.log("📄 Loaded existing deployment info\n");
  }

  // Get token addresses from deployment info or environment
  const angelTokenAddress = deploymentInfo.ANGELToken?.address || process.env.ANGEL_TOKEN_ADDRESS;
  const capxTokenAddress = deploymentInfo.CAPXToken?.address || process.env.CAPX_TOKEN_ADDRESS;

  if (!angelTokenAddress || !capxTokenAddress) {
    throw new Error(
      "Token addresses not found. Deploy tokens first or set ANGEL_TOKEN_ADDRESS and CAPX_TOKEN_ADDRESS env variables."
    );
  }

  console.log("📍 Token Addresses:");
  console.log("ANGEL Token:", angelTokenAddress);
  console.log("CAPX Token:", capxTokenAddress);
  console.log();

  // Deploy ANGELVesting
  console.log("📦 Deploying ANGELVesting...");
  const ANGELVesting = await hre.ethers.getContractFactory("ANGELVesting");
  const angelVesting = await ANGELVesting.deploy(angelTokenAddress);
  await angelVesting.deployed();

  console.log("✅ ANGELVesting deployed to:", angelVesting.address);
  console.log();

  // Deploy CAPXVesting
  console.log("📦 Deploying CAPXVesting...");
  const CAPXVesting = await hre.ethers.getContractFactory("CAPXVesting");
  const capxVesting = await CAPXVesting.deploy(capxTokenAddress);
  await capxVesting.deployed();

  console.log("✅ CAPXVesting deployed to:", capxVesting.address);
  console.log();

  // Update deployment info
  const network = hre.network.name;

  deploymentInfo.ANGELVesting = {
    address: angelVesting.address,
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    tokenAddress: angelTokenAddress,
    cliffDuration: "36 months",
    vestingDuration: "50 months",
    totalDuration: "86 months"
  };

  deploymentInfo.CAPXVesting = {
    address: capxVesting.address,
    network: network,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    tokenAddress: capxTokenAddress,
    cliffDuration: "36 months",
    vestingDuration: "50 months",
    totalDuration: "86 months"
  };

  // Save deployment info
  fs.writeFileSync(
    deploymentInfoPath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployment-info.json\n");

  // Display summary
  console.log("═══════════════════════════════════════════════════");
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log("Network:", network);
  console.log("Deployer:", deployer.address);
  console.log();
  console.log("ANGEL Token:", angelTokenAddress);
  console.log("ANGELVesting:", angelVesting.address);
  console.log();
  console.log("CAPX Token:", capxTokenAddress);
  console.log("CAPXVesting:", capxVesting.address);
  console.log();
  console.log("Vesting Parameters:");
  console.log("  - Cliff: 36 months");
  console.log("  - Linear Vesting: 50 months");
  console.log("  - Total Duration: 86 months");
  console.log("═══════════════════════════════════════════════════");
  console.log();

  // Wait for block confirmations before verification
  if (network !== "hardhat" && network !== "localhost") {
    console.log("⏳ Waiting for block confirmations...");
    await angelVesting.deployTransaction.wait(6);
    await capxVesting.deployTransaction.wait(6);
    console.log("✅ Block confirmations complete\n");

    console.log("📝 To verify contracts, run:");
    console.log(`npx hardhat verify --network ${network} ${angelVesting.address} ${angelTokenAddress}`);
    console.log(`npx hardhat verify --network ${network} ${capxVesting.address} ${capxTokenAddress}`);
    console.log();
  }

  console.log("🎉 Deployment completed successfully!\n");

  console.log("⚠️  NEXT STEPS:");
  console.log("1. Transfer tokens to vesting contracts");
  console.log("2. Create vesting schedules using createVesting()");
  console.log("3. Verify contracts on block explorer");
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
