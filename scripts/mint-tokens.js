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
  console.log("Minting Tokens on Ethereum Sepolia Testnet");
  console.log("========================================");
  console.log("Account:", signer.address);

  // Configuration - Set amounts to mint
  const CAPX_MINT_AMOUNT = process.env.CAPX_AMOUNT || "1000000"; // 1M tokens default
  const ANGEL_MINT_AMOUNT = process.env.ANGEL_AMOUNT || "5000000"; // 5M tokens default
  const RECIPIENT = process.env.RECIPIENT || signer.address;

  console.log("\nMinting Configuration:");
  console.log("  Recipient:", RECIPIENT);
  console.log("  CAPX Amount:", CAPX_MINT_AMOUNT, "CAPY");
  console.log("  ANGEL Amount:", ANGEL_MINT_AMOUNT, "SEED");

  // Mint CAPX tokens
  console.log("\n========================================");
  console.log("Minting CAPX Tokens");
  console.log("========================================");
  const capxAddress = deploymentInfo.contracts.CAPX.address;
  const capx = await hre.ethers.getContractAt("CAPX", capxAddress);

  try {
    const capxAmount = hre.ethers.parseEther(CAPX_MINT_AMOUNT);
    console.log("Minting", hre.ethers.formatEther(capxAmount), "CAPY to", RECIPIENT);

    const capxTx = await capx.teamMint(RECIPIENT, capxAmount);
    console.log("Transaction hash:", capxTx.hash);
    console.log("Waiting for confirmation...");

    await capxTx.wait();
    console.log("CAPX tokens minted successfully!");

    const capxBalance = await capx.balanceOf(RECIPIENT);
    console.log("New CAPX balance:", hre.ethers.formatEther(capxBalance), "CAPY");
  } catch (error) {
    console.error("Error minting CAPX:", error.message);
  }

  // Mint ANGEL tokens
  console.log("\n========================================");
  console.log("Minting ANGEL Tokens");
  console.log("========================================");
  const angelAddress = deploymentInfo.contracts.ANGEL.address;
  const angel = await hre.ethers.getContractAt("ANGEL", angelAddress);

  try {
    const angelAmount = hre.ethers.parseEther(ANGEL_MINT_AMOUNT);
    const reason = "Initial token distribution";
    console.log("Minting", hre.ethers.formatEther(angelAmount), "SEED to", RECIPIENT);
    console.log("Reason:", reason);

    const angelTx = await angel.rewardMint(RECIPIENT, angelAmount, reason);
    console.log("Transaction hash:", angelTx.hash);
    console.log("Waiting for confirmation...");

    await angelTx.wait();
    console.log("ANGEL tokens minted successfully!");

    const angelBalance = await angel.balanceOf(RECIPIENT);
    console.log("New ANGEL balance:", hre.ethers.formatEther(angelBalance), "SEED");
  } catch (error) {
    console.error("Error minting ANGEL:", error.message);
  }

  console.log("\n========================================");
  console.log("Minting Complete");
  console.log("========================================");
  console.log("\nRun check-balance.js to verify:");
  console.log("npx hardhat run scripts/check-balance.js --network sepolia");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
