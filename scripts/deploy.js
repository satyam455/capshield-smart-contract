const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("========================================");
  console.log("Deploying to Ethereum Sepolia Testnet");
  console.log("========================================");
  console.log("Deployer address:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // Configuration - Set deployment addresses
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;
  const DAO_ADDRESS = process.env.DAO_ADDRESS || deployer.address;
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;

  console.log("\nDeployment Configuration:");
  console.log("  Treasury:", TREASURY_ADDRESS);
  console.log("  DAO:", DAO_ADDRESS);
  console.log("  Admin:", ADMIN_ADDRESS);

  // Deploy CAPX Token
  console.log("\n========================================");
  console.log("Deploying CAPX (Shield Token)");
  console.log("========================================");

  const CAPX = await hre.ethers.getContractFactory("CAPX");
  console.log("Deploying contract...");
  const capx = await CAPX.deploy(TREASURY_ADDRESS, DAO_ADDRESS, ADMIN_ADDRESS);
  await capx.waitForDeployment();

  const capxAddress = await capx.getAddress();
  console.log("CAPX deployed to:", capxAddress);
  console.log("  Name:", await capx.name());
  console.log("  Symbol:", await capx.symbol());
  console.log("  Max Supply:", hre.ethers.formatEther(await capx.MAX_SUPPLY()));

  // Deploy ANGEL Token
  console.log("\n========================================");
  console.log("Deploying ANGEL (Community Token)");
  console.log("========================================");

  const ANGEL = await hre.ethers.getContractFactory("ANGEL");
  console.log("Deploying contract...");
  const angel = await ANGEL.deploy(ADMIN_ADDRESS);
  await angel.waitForDeployment();

  const angelAddress = await angel.getAddress();
  console.log("ANGEL deployed to:", angelAddress);
  console.log("  Name:", await angel.name());
  console.log("  Symbol:", await angel.symbol());
  console.log("  Max Supply:", hre.ethers.formatEther(await angel.MAX_SUPPLY()));

  // Save deployment info
  const fs = require("fs");

  const capxMaxSupply = await capx.MAX_SUPPLY();
  const angelMaxSupply = await angel.MAX_SUPPLY();

  const deploymentInfo = {
    network: "Ethereum Sepolia Testnet",
    chainId: 11155111,
    deployer: deployer.address,
    config: {
      treasury: TREASURY_ADDRESS,
      dao: DAO_ADDRESS,
      admin: ADMIN_ADDRESS
    },
    contracts: {
      CAPX: {
        address: capxAddress,
        name: await capx.name(),
        symbol: await capx.symbol(),
        decimals: Number(await capx.decimals()),
        maxSupply: capxMaxSupply.toString()
      },
      ANGEL: {
        address: angelAddress,
        name: await angel.name(),
        symbol: await angel.symbol(),
        decimals: Number(await angel.decimals()),
        maxSupply: angelMaxSupply.toString()
      }
    },
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync("deployment-sepolia.json", JSON.stringify(deploymentInfo, null, 2));

  console.log("\n========================================");
  console.log("Deployment Complete");
  console.log("========================================");
  console.log("CAPX:", capxAddress);
  console.log("ANGEL:", angelAddress);
  console.log("\nDeployment info saved to: deployment-sepolia.json");
  console.log("\nVerify contracts:");
  console.log(`npx hardhat verify --network sepolia ${capxAddress} "${TREASURY_ADDRESS}" "${DAO_ADDRESS}" "${ADMIN_ADDRESS}"`);
  console.log(`npx hardhat verify --network sepolia ${angelAddress} "${ADMIN_ADDRESS}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
