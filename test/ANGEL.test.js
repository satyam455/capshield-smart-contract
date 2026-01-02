const { expect } = require("chai");
const hre = require("hardhat");

describe("ANGEL Token - Community Reward Token", function () {
  let angel;
  let owner, user1, user2, user3, user4, user5;
  let REWARD_MINTER_ROLE, PAUSER_ROLE;

  beforeEach(async function () {
    [owner, user1, user2, user3, user4, user5] = await hre.ethers.getSigners();

    const ANGEL = await hre.ethers.getContractFactory("ANGEL");
    angel = await ANGEL.deploy(owner.address);

    REWARD_MINTER_ROLE = await angel.REWARD_MINTER_ROLE();
    PAUSER_ROLE = await angel.PAUSER_ROLE();
  });

  describe("Deployment", function () {
    it("Should have correct name and symbol", async function () {
      expect(await angel.name()).to.equal("AngleSeed Token");
      expect(await angel.symbol()).to.equal("SEED");
      expect(await angel.decimals()).to.equal(18);
    });

    it("Should start with zero total supply", async function () {
      expect(await angel.totalSupply()).to.equal(0);
      expect(await angel.totalMinted()).to.equal(0);
    });

    it("Should have correct MAX_SUPPLY (10 Billion)", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      expect(maxSupply).to.equal(hre.ethers.parseEther("10000000000"));
    });

    it("Should grant all roles to admin", async function () {
      const DEFAULT_ADMIN_ROLE = await angel.DEFAULT_ADMIN_ROLE();
      expect(await angel.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await angel.hasRole(REWARD_MINTER_ROLE, owner.address)).to.be.true;
      expect(await angel.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });

    it("Should revert if deployed with zero address", async function () {
      const ANGEL = await hre.ethers.getContractFactory("ANGEL");
      await expect(
        ANGEL.deploy(hre.ethers.ZeroAddress)
      ).to.be.revertedWith("Admin address cannot be zero");
    });
  });

  describe("Reward Minting - Single Recipient", function () {
    it("Should allow REWARD_MINTER_ROLE to mint tokens with reason", async function () {
      const amount = hre.ethers.parseEther("1000");
      const reason = "Community engagement reward";

      await angel.rewardMint(user1.address, amount, reason);

      expect(await angel.balanceOf(user1.address)).to.equal(amount);
      expect(await angel.totalMinted()).to.equal(amount);
      expect(await angel.totalSupply()).to.equal(amount);
    });

    it("Should emit RewardMint event", async function () {
      const amount = hre.ethers.parseEther("500");
      const reason = "Bug bounty reward";

      await expect(angel.rewardMint(user1.address, amount, reason))
        .to.emit(angel, "RewardMint")
        .withArgs(user1.address, amount, reason);
    });

    it("Should revert if reason is empty", async function () {
      const amount = hre.ethers.parseEther("100");

      await expect(
        angel.rewardMint(user1.address, amount, "")
      ).to.be.revertedWith("Reason cannot be empty");
    });

    it("Should revert if amount is zero", async function () {
      await expect(
        angel.rewardMint(user1.address, 0, "Test reward")
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("Should revert if recipient is zero address", async function () {
      await expect(
        angel.rewardMint(hre.ethers.ZeroAddress, hre.ethers.parseEther("100"), "Test")
      ).to.be.revertedWith("Cannot mint to zero address");
    });

    it("Should prevent unauthorized minting", async function () {
      const amount = hre.ethers.parseEther("1000");

      await expect(
        angel.connect(user1).rewardMint(user2.address, amount, "Unauthorized mint")
      ).to.be.reverted;
    });
  });

  describe("Batch Reward Minting", function () {
    it("Should mint tokens to multiple recipients", async function () {
      const recipients = [user1.address, user2.address, user3.address];
      const amounts = [
        hre.ethers.parseEther("100"),
        hre.ethers.parseEther("200"),
        hre.ethers.parseEther("300")
      ];
      const reason = "Community contest winners";

      await angel.batchRewardMint(recipients, amounts, reason);

      expect(await angel.balanceOf(user1.address)).to.equal(amounts[0]);
      expect(await angel.balanceOf(user2.address)).to.equal(amounts[1]);
      expect(await angel.balanceOf(user3.address)).to.equal(amounts[2]);

      const totalMinted = amounts[0] + amounts[1] + amounts[2];
      expect(await angel.totalMinted()).to.equal(totalMinted);
    });

    it("Should emit RewardMint event for each recipient", async function () {
      const recipients = [user1.address, user2.address];
      const amounts = [
        hre.ethers.parseEther("50"),
        hre.ethers.parseEther("75")
      ];
      const reason = "Batch reward test";

      await expect(angel.batchRewardMint(recipients, amounts, reason))
        .to.emit(angel, "RewardMint");
    });

    it("Should revert if arrays length mismatch", async function () {
      const recipients = [user1.address, user2.address];
      const amounts = [hre.ethers.parseEther("100")];

      await expect(
        angel.batchRewardMint(recipients, amounts, "Mismatch test")
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should revert if arrays are empty", async function () {
      await expect(
        angel.batchRewardMint([], [], "Empty arrays")
      ).to.be.revertedWith("Empty arrays");
    });

    it("Should revert if reason is empty in batch mint", async function () {
      const recipients = [user1.address];
      const amounts = [hre.ethers.parseEther("100")];

      await expect(
        angel.batchRewardMint(recipients, amounts, "")
      ).to.be.revertedWith("Reason cannot be empty");
    });

    it("Should handle large batch efficiently", async function () {
      const recipients = [];
      const amounts = [];

      for (let i = 0; i < 10; i++) {
        recipients.push(user1.address);
        amounts.push(hre.ethers.parseEther("10"));
      }

      await angel.batchRewardMint(recipients, amounts, "Large batch test");

      expect(await angel.balanceOf(user1.address)).to.equal(
        hre.ethers.parseEther("100")
      );
    });
  });

  describe("Hard Cap Enforcement", function () {
    it("Should allow minting up to MAX_SUPPLY", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      await angel.rewardMint(user1.address, maxSupply, "Maximum mint");

      expect(await angel.totalMinted()).to.equal(maxSupply);
      expect(await angel.balanceOf(user1.address)).to.equal(maxSupply);
    });

    it("Should prevent minting beyond MAX_SUPPLY", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      await angel.rewardMint(user1.address, maxSupply, "Full supply");

      await expect(
        angel.rewardMint(user2.address, 1, "Over limit")
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should track remaining mintable supply correctly", async function () {
      const amount = hre.ethers.parseEther("1000000000");
      await angel.rewardMint(user1.address, amount, "Large mint");

      const remaining = await angel.remainingMintableSupply();
      const maxSupply = await angel.MAX_SUPPLY();

      expect(remaining).to.equal(maxSupply - amount);
    });

    it("Should prevent batch mint if it exceeds cap", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      const halfSupply = maxSupply / 2n;

      await angel.rewardMint(user1.address, halfSupply, "Half supply");

      const recipients = [user2.address, user3.address];
      const amounts = [halfSupply, hre.ethers.parseEther("100")];

      await expect(
        angel.batchRewardMint(recipients, amounts, "Over cap batch")
      ).to.be.revertedWith("Minting would exceed max supply");
    });
  });

  describe("Burn Functionality", function () {
    beforeEach(async function () {
      await angel.rewardMint(user1.address, hre.ethers.parseEther("10000"), "Test mint");
    });

    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = hre.ethers.parseEther("1000");
      await angel.connect(user1).burn(burnAmount);

      expect(await angel.balanceOf(user1.address)).to.equal(
        hre.ethers.parseEther("9000")
      );
    });

    it("Should reduce total supply when burning", async function () {
      const initialSupply = await angel.totalSupply();
      const burnAmount = hre.ethers.parseEther("2000");

      await angel.connect(user1).burn(burnAmount);

      expect(await angel.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should NOT reduce totalMinted when burning", async function () {
      const totalMintedBefore = await angel.totalMinted();
      const burnAmount = hre.ethers.parseEther("3000");

      await angel.connect(user1).burn(burnAmount);

      const totalMintedAfter = await angel.totalMinted();
      expect(totalMintedAfter).to.equal(totalMintedBefore);
    });

    it("Should NOT free up mint capacity when burning", async function () {
      const mintedBefore = await angel.totalMinted();
      const burnAmount = hre.ethers.parseEther("5000");

      await angel.connect(user1).burn(burnAmount);

      const remainingBefore = (await angel.MAX_SUPPLY()) - mintedBefore;
      const remainingAfter = await angel.remainingMintableSupply();

      expect(remainingAfter).to.equal(remainingBefore);
    });

    it("Should allow burnFrom with allowance", async function () {
      const burnAmount = hre.ethers.parseEther("500");
      await angel.connect(user1).approve(user2.address, burnAmount);
      await angel.connect(user2).burnFrom(user1.address, burnAmount);

      expect(await angel.balanceOf(user1.address)).to.equal(
        hre.ethers.parseEther("9500")
      );
    });

    it("Should verify burn does not increase mintable capacity scenario", async function () {
      const ANGEL = await hre.ethers.getContractFactory("ANGEL");
      const freshAngel = await ANGEL.deploy(owner.address);

      const maxSupply = await freshAngel.MAX_SUPPLY();

      await freshAngel.rewardMint(user1.address, maxSupply, "Full mint");

      expect(await freshAngel.totalMinted()).to.equal(maxSupply);

      await freshAngel.connect(user1).burn(hre.ethers.parseEther("1000000"));

      await expect(
        freshAngel.rewardMint(user2.address, 1, "Should fail")
      ).to.be.revertedWith("Minting would exceed max supply");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow PAUSER_ROLE to pause contract", async function () {
      await angel.pause();
      expect(await angel.paused()).to.be.true;
    });

    it("Should allow PAUSER_ROLE to unpause contract", async function () {
      await angel.pause();
      await angel.unpause();
      expect(await angel.paused()).to.be.false;
    });

    it("Should prevent transfers when paused", async function () {
      await angel.rewardMint(user1.address, hre.ethers.parseEther("1000"), "Test");
      await angel.pause();

      await expect(
        angel.connect(user1).transfer(user2.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent minting when paused", async function () {
      await angel.pause();

      await expect(
        angel.rewardMint(user1.address, hre.ethers.parseEther("1000"), "Test")
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent batch minting when paused", async function () {
      await angel.pause();

      const recipients = [user1.address, user2.address];
      const amounts = [hre.ethers.parseEther("100"), hre.ethers.parseEther("200")];

      await expect(
        angel.batchRewardMint(recipients, amounts, "Paused test")
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent non-pauser from pausing", async function () {
      await expect(
        angel.connect(user1).pause()
      ).to.be.reverted;
    });

    it("Should allow transfers after unpausing", async function () {
      await angel.rewardMint(user1.address, hre.ethers.parseEther("1000"), "Test");
      await angel.pause();
      await angel.unpause();

      await angel.connect(user1).transfer(user2.address, hre.ethers.parseEther("100"));
      expect(await angel.balanceOf(user2.address)).to.equal(hre.ethers.parseEther("100"));
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant REWARD_MINTER_ROLE", async function () {
      await angel.grantRole(REWARD_MINTER_ROLE, user1.address);
      expect(await angel.hasRole(REWARD_MINTER_ROLE, user1.address)).to.be.true;
    });

    it("Should allow new minter to mint after role granted", async function () {
      await angel.grantRole(REWARD_MINTER_ROLE, user1.address);

      await angel.connect(user1).rewardMint(
        user2.address,
        hre.ethers.parseEther("500"),
        "Granted role mint"
      );

      expect(await angel.balanceOf(user2.address)).to.equal(hre.ethers.parseEther("500"));
    });

    it("Should allow admin to revoke REWARD_MINTER_ROLE", async function () {
      await angel.grantRole(REWARD_MINTER_ROLE, user1.address);
      await angel.revokeRole(REWARD_MINTER_ROLE, user1.address);

      expect(await angel.hasRole(REWARD_MINTER_ROLE, user1.address)).to.be.false;
    });

    it("Should prevent minting after role revoked", async function () {
      await angel.grantRole(REWARD_MINTER_ROLE, user1.address);
      await angel.revokeRole(REWARD_MINTER_ROLE, user1.address);

      await expect(
        angel.connect(user1).rewardMint(user2.address, hre.ethers.parseEther("100"), "Test")
      ).to.be.reverted;
    });

    it("Should prevent non-admin from granting roles", async function () {
      await expect(
        angel.connect(user1).grantRole(REWARD_MINTER_ROLE, user2.address)
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct canMint status", async function () {
      const amount = hre.ethers.parseEther("1000000");
      expect(await angel.canMint(amount)).to.be.true;

      const maxSupply = await angel.MAX_SUPPLY();
      await angel.rewardMint(user1.address, maxSupply, "Max mint");

      expect(await angel.canMint(1)).to.be.false;
    });

    it("Should return correct remaining mintable supply", async function () {
      const maxSupply = await angel.MAX_SUPPLY();
      expect(await angel.remainingMintableSupply()).to.equal(maxSupply);

      const mintAmount = hre.ethers.parseEther("1000000000");
      await angel.rewardMint(user1.address, mintAmount, "Large mint");

      expect(await angel.remainingMintableSupply()).to.equal(maxSupply - mintAmount);
    });

    it("Should show difference between totalSupply and totalMinted after burn", async function () {
      const mintAmount = hre.ethers.parseEther("10000");
      await angel.rewardMint(user1.address, mintAmount, "Test mint");

      const burnAmount = hre.ethers.parseEther("3000");
      await angel.connect(user1).burn(burnAmount);

      expect(await angel.totalMinted()).to.equal(mintAmount);
      expect(await angel.totalSupply()).to.equal(mintAmount - burnAmount);
    });
  });

  describe("Standard ERC20 Functions", function () {
    beforeEach(async function () {
      await angel.rewardMint(user1.address, hre.ethers.parseEther("10000"), "Setup");
    });

    it("Should allow standard transfers", async function () {
      await angel.connect(user1).transfer(user2.address, hre.ethers.parseEther("500"));
      expect(await angel.balanceOf(user2.address)).to.equal(hre.ethers.parseEther("500"));
    });

    it("Should allow approve and transferFrom", async function () {
      await angel.connect(user1).approve(user2.address, hre.ethers.parseEther("1000"));

      await angel.connect(user2).transferFrom(
        user1.address,
        user3.address,
        hre.ethers.parseEther("300")
      );

      expect(await angel.balanceOf(user3.address)).to.equal(hre.ethers.parseEther("300"));
    });

    it("Should track allowances correctly", async function () {
      const allowanceAmount = hre.ethers.parseEther("2000");
      await angel.connect(user1).approve(user2.address, allowanceAmount);

      expect(await angel.allowance(user1.address, user2.address)).to.equal(allowanceAmount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple mints to same address", async function () {
      await angel.rewardMint(user1.address, hre.ethers.parseEther("100"), "First");
      await angel.rewardMint(user1.address, hre.ethers.parseEther("200"), "Second");
      await angel.rewardMint(user1.address, hre.ethers.parseEther("300"), "Third");

      expect(await angel.balanceOf(user1.address)).to.equal(hre.ethers.parseEther("600"));
    });

    it("Should handle very small amounts", async function () {
      await angel.rewardMint(user1.address, 1, "Tiny amount");
      expect(await angel.balanceOf(user1.address)).to.equal(1);
    });

    it("Should handle long reason strings", async function () {
      const longReason = "A".repeat(1000);
      await angel.rewardMint(user1.address, hre.ethers.parseEther("100"), longReason);
      expect(await angel.balanceOf(user1.address)).to.equal(hre.ethers.parseEther("100"));
    });
  });
});
