const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Load deployment info
  if (!fs.existsSync("deployment-sepolia.json")) {
    console.error("Error: deployment-sepolia.json not found");
    console.error("Please deploy contracts first using: npx hardhat run scripts/deploy.js --network sepolia");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-sepolia.json", "utf8"));
  const [signer] = await hre.ethers.getSigners();

  console.log("========================================");
  console.log("Checking Balances on Ethereum Sepolia Testnet");
  console.log("========================================");
  console.log("Wallet Address:", signer.address);
  console.log("ETH Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(signer.address)), "ETH\n");

  // Check CAPX balance
  console.log("========================================");
  console.log("CAPX Token (Shield Token)");
  console.log("========================================");
  const capxAddress = deploymentInfo.contracts.CAPX.address;
  console.log("Contract Address:", capxAddress);

  const capx = await hre.ethers.getContractAt("CAPX", capxAddress);
  const capxBalance = await capx.balanceOf(signer.address);
  const capxTotalSupply = await capx.totalSupply();
  const capxTotalMinted = await capx.totalMinted();
  const capxMaxSupply = await capx.MAX_SUPPLY();
  const capxRemaining = await capx.remainingMintableSupply();

  console.log("Your Balance:", hre.ethers.formatEther(capxBalance), "CAPY");
  console.log("Total Supply:", hre.ethers.formatEther(capxTotalSupply), "CAPY");
  console.log("Total Minted:", hre.ethers.formatEther(capxTotalMinted), "CAPY");
  console.log("Max Supply:", hre.ethers.formatEther(capxMaxSupply), "CAPY");
  console.log("Remaining Mintable:", hre.ethers.formatEther(capxRemaining), "CAPY");
  console.log("Treasury Address:", await capx.treasuryAddress());
  console.log("DAO Address:", await capx.daoAddress());

  // Check ANGEL balance
  console.log("\n========================================");
  console.log("ANGEL Token (Community Token)");
  console.log("========================================");
  const angelAddress = deploymentInfo.contracts.ANGEL.address;
  console.log("Contract Address:", angelAddress);

  const angel = await hre.ethers.getContractAt("ANGEL", angelAddress);
  const angelBalance = await angel.balanceOf(signer.address);
  const angelTotalSupply = await angel.totalSupply();
  const angelTotalMinted = await angel.totalMinted();
  const angelMaxSupply = await angel.MAX_SUPPLY();
  const angelRemaining = await angel.remainingMintableSupply();

  console.log("Your Balance:", hre.ethers.formatEther(angelBalance), "SEED");
  console.log("Total Supply:", hre.ethers.formatEther(angelTotalSupply), "SEED");
  console.log("Total Minted:", hre.ethers.formatEther(angelTotalMinted), "SEED");
  console.log("Max Supply:", hre.ethers.formatEther(angelMaxSupply), "SEED");
  console.log("Remaining Mintable:", hre.ethers.formatEther(angelRemaining), "SEED");

  console.log("\n========================================");
  console.log("Check balances complete");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
