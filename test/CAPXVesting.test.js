const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CAPXVesting", function () {
  let capxToken;
  let capxVesting;
  let owner;
  let beneficiary1;
  let beneficiary2;
  let addr3;

  const TOTAL_SUPPLY = ethers.parseEther("100000000"); // 100M CAPX
  const VESTING_AMOUNT = ethers.parseEther("1000000"); // 1M CAPX

  const CLIFF_DURATION = 36 * 30 * 24 * 60 * 60; // 36 months in seconds
  const VESTING_DURATION = 50 * 30 * 24 * 60 * 60; // 50 months in seconds
  const TOTAL_DURATION = CLIFF_DURATION + VESTING_DURATION; // 86 months

  beforeEach(async function () {
    [owner, beneficiary1, beneficiary2, addr3] = await ethers.getSigners();

    // Deploy CAPX token
    const CAPX = await ethers.getContractFactory("CAPX");
    capxToken = await CAPX.deploy();

    // Deploy CAPXVesting
    const CAPXVesting = await ethers.getContractFactory("CAPXVesting");
    capxVesting = await CAPXVesting.deploy(capxToken.target);

    // Transfer tokens to vesting contract
    await capxToken.transfer(capxVesting.target, VESTING_AMOUNT * 10n);
  });

  describe("Deployment", function () {
    it("Should set the correct token address", async function () {
      expect(await capxVesting.capxToken()).to.equal(capxToken.target);
    });

    it("Should set the correct owner", async function () {
      expect(await capxVesting.owner()).to.equal(owner.address);
    });

    it("Should have correct vesting parameters", async function () {
      expect(await capxVesting.CLIFF_DURATION()).to.equal(CLIFF_DURATION);
      expect(await capxVesting.VESTING_DURATION()).to.equal(VESTING_DURATION);
      expect(await capxVesting.TOTAL_DURATION()).to.equal(TOTAL_DURATION);
    });

    it("Should have zero initial allocation", async function () {
      expect(await capxVesting.totalAllocated()).to.equal(0);
    });
  });

  describe("Creating Vesting", function () {
    it("Should create vesting successfully", async function () {
      const tx = await capxVesting.createVesting(beneficiary1.address, VESTING_AMOUNT);
      const receipt = await tx.wait();

      expect(receipt).to.emit(capxVesting, "VestingCreated");

      const vesting = await capxVesting.getVesting(beneficiary1.address);
      expect(vesting.totalAllocation).to.equal(VESTING_AMOUNT);
      expect(vesting.claimed).to.equal(0);
      expect(vesting.revoked).to.equal(false);

      expect(await capxVesting.totalAllocated()).to.equal(VESTING_AMOUNT);
    });

    it("Should create multiple vestings", async function () {
      await capxVesting.createVesting(beneficiary1.address, VESTING_AMOUNT);
      await capxVesting.createVesting(beneficiary2.address, VESTING_AMOUNT);

      expect(await capxVesting.totalAllocated()).to.equal(VESTING_AMOUNT * 2n);
    });

    it("Should fail when creating vesting for zero address", async function () {
      await expect(
        capxVesting.createVesting(ethers.ZeroAddress, VESTING_AMOUNT)
      ).to.be.revertedWith("Invalid beneficiary");
    });

    it("Should fail when allocation is zero", async function () {
      await expect(
        capxVesting.createVesting(beneficiary1.address, 0)
      ).to.be.revertedWith("Allocation must be > 0");
    });

    it("Should fail when vesting already exists", async function () {
      await capxVesting.createVesting(beneficiary1.address, VESTING_AMOUNT);

      await expect(
        capxVesting.createVesting(beneficiary1.address, VESTING_AMOUNT)
      ).to.be.revertedWith("Vesting already exists");
    });

    it("Should fail when not enough tokens in contract", async function () {
      const hugeAmount = ethers.parseEther("100000000000");
      await expect(
        capxVesting.createVesting(beneficiary1.address, hugeAmount)
      ).to.be.revertedWith("Insufficient tokens in contract");
    });

    it("Should fail when called by non-owner", async function () {
      await expect(
        capxVesting.connect(beneficiary1).createVesting(beneficiary2.address, VESTING_AMOUNT)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Claiming Tokens", function () {
    beforeEach(async function () {
      await capxVesting.createVesting(beneficiary1.address, VESTING_AMOUNT);
    });

    it("Should not allow claiming before cliff", async function () {
      await expect(
        capxVesting.connect(beneficiary1).claim()
      ).to.be.revertedWith("No tokens to claim");
    });

    it("Should allow claiming after cliff", async function () {
      // Fast forward to after cliff (36 months + 1 month into vesting)
      await time.increase(CLIFF_DURATION + 30 * 24 * 60 * 60);

      const claimable = await capxVesting.claimableAmount(beneficiary1.address);
      expect(claimable).to.be.gt(0);

      await capxVesting.connect(beneficiary1).claim();

      const vesting = await capxVesting.getVesting(beneficiary1.address);
      expect(vesting.claimed).to.be.closeTo(claimable, claimable / 100n);
    });

    it("Should allow claiming all tokens after vesting end", async function () {
      // Fast forward to after vesting end
      await time.increase(TOTAL_DURATION + 1);

      const claimable = await capxVesting.claimableAmount(beneficiary1.address);
      expect(claimable).to.equal(VESTING_AMOUNT);

      await capxVesting.connect(beneficiary1).claim();

      const vesting = await capxVesting.getVesting(beneficiary1.address);
      expect(vesting.claimed).to.equal(VESTING_AMOUNT);
    });

    it("Should calculate correct vested amount during vesting period", async function () {
      // Fast forward to 25% through vesting period (after cliff)
      await time.increase(CLIFF_DURATION + VESTING_DURATION / 4);

      const claimable = await capxVesting.claimableAmount(beneficiary1.address);
      const expected = VESTING_AMOUNT / 4n;

      // Allow 1% tolerance for rounding
      expect(claimable).to.be.closeTo(expected, expected / 100n);
    });

    it("Should fail when no vesting exists", async function () {
      await expect(
        capxVesting.connect(beneficiary2).claim()
      ).to.be.revertedWith("No vesting found");
    });

    it("Should fail when vesting is revoked", async function () {
      await capxVesting.revoke(beneficiary1.address);

      await expect(
        capxVesting.connect(beneficiary1).claim()
      ).to.be.revertedWith("Vesting revoked");
    });

    it("Should allow multiple claims", async function () {
      // First claim after cliff + 10 months
      await time.increase(CLIFF_DURATION + 10 * 30 * 24 * 60 * 60);
      const claimable1 = await capxVesting.claimableAmount(beneficiary1.address);
      await capxVesting.connect(beneficiary1).claim();

      // Second claim after another 10 months
      await time.increase(10 * 30 * 24 * 60 * 60);
      const claimable2 = await capxVesting.claimableAmount(beneficiary1.address);
      await capxVesting.connect(beneficiary1).claim();

      const vesting = await capxVesting.getVesting(beneficiary1.address);
      const expected = claimable1 + claimable2;
      expect(vesting.claimed).to.be.closeTo(expected, expected / 100n);
    });
  });

  describe("Revoking Vesting", function () {
    beforeEach(async function () {
      await capxVesting.createVesting(beneficiary1.address, VESTING_AMOUNT);
    });

    it("Should revoke vesting successfully before cliff", async function () {
      const ownerBalanceBefore = await capxToken.balanceOf(owner.address);
      const totalAllocatedBefore = await capxVesting.totalAllocated();

      await expect(capxVesting.revoke(beneficiary1.address))
        .to.emit(capxVesting, "VestingRevoked")
        .withArgs(beneficiary1.address, 0, VESTING_AMOUNT);

      const vesting = await capxVesting.getVesting(beneficiary1.address);
      expect(vesting.revoked).to.equal(true);

      const ownerBalanceAfter = await capxToken.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(VESTING_AMOUNT);

      const totalAllocatedAfter = await capxVesting.totalAllocated();
      expect(totalAllocatedBefore - totalAllocatedAfter).to.equal(VESTING_AMOUNT);
    });

    it("Should revoke vesting and return only unvested tokens", async function () {
      // Fast forward to 50% through vesting
      await time.increase(CLIFF_DURATION + VESTING_DURATION / 2);

      // Claim vested tokens
      await capxVesting.connect(beneficiary1).claim();

      const vesting = await capxVesting.getVesting(beneficiary1.address);
      const claimed = vesting.claimed;

      const ownerBalanceBefore = await capxToken.balanceOf(owner.address);

      await capxVesting.revoke(beneficiary1.address);

      const ownerBalanceAfter = await capxToken.balanceOf(owner.address);
      const returned = ownerBalanceAfter - ownerBalanceBefore;

      // Returned should be approximately half (allowing for rounding)
      const expected = VESTING_AMOUNT - claimed;
      expect(returned).to.be.closeTo(expected, expected / 100n);
    });

    it("Should fail when vesting doesn't exist", async function () {
      await expect(
        capxVesting.revoke(beneficiary2.address)
      ).to.be.revertedWith("No vesting found");
    });

    it("Should fail when already revoked", async function () {
      await capxVesting.revoke(beneficiary1.address);

      await expect(
        capxVesting.revoke(beneficiary1.address)
      ).to.be.revertedWith("Already revoked");
    });

    it("Should fail when called by non-owner", async function () {
      await expect(
        capxVesting.connect(beneficiary1).revoke(beneficiary1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await capxVesting.createVesting(beneficiary1.address, VESTING_AMOUNT);
    });

    it("Should return correct locked amount", async function () {
      const locked = await capxVesting.lockedAmount(beneficiary1.address);
      expect(locked).to.equal(VESTING_AMOUNT);

      // After cliff + 25% vesting
      await time.increase(CLIFF_DURATION + VESTING_DURATION / 4);
      const lockedAfter = await capxVesting.lockedAmount(beneficiary1.address);
      expect(lockedAfter).to.be.closeTo(
        (VESTING_AMOUNT * 3n) / 4n,
        VESTING_AMOUNT / 100n
      );
    });

    it("Should return correct vesting progress", async function () {
      expect(await capxVesting.vestingProgress(beneficiary1.address)).to.equal(0);

      await time.increase(CLIFF_DURATION + VESTING_DURATION / 2);
      expect(await capxVesting.vestingProgress(beneficiary1.address)).to.equal(50);

      await time.increase(VESTING_DURATION / 2);
      expect(await capxVesting.vestingProgress(beneficiary1.address)).to.equal(100);
    });

    it("Should return correct weeks left", async function () {
      const weeksTotal = Math.floor(TOTAL_DURATION / (7 * 24 * 60 * 60));
      const weeksLeft = await capxVesting.weeksLeft(beneficiary1.address);
      expect(Number(weeksLeft)).to.be.closeTo(weeksTotal, 2);

      await time.increase(TOTAL_DURATION);
      expect(await capxVesting.weeksLeft(beneficiary1.address)).to.equal(0);
    });

    it("Should return correct next unlock time", async function () {
      const vesting = await capxVesting.getVesting(beneficiary1.address);
      expect(await capxVesting.nextUnlockTime(beneficiary1.address)).to.equal(vesting.cliffEnd);

      await time.increase(CLIFF_DURATION + 1);
      const currentTime = await time.latest();
      expect(await capxVesting.nextUnlockTime(beneficiary1.address)).to.equal(currentTime);
    });

    it("Should return correct available tokens", async function () {
      const available = await capxVesting.availableTokens();
      expect(available).to.equal(VESTING_AMOUNT * 10n);
    });
  });

  describe("Pause Functionality", function () {
    beforeEach(async function () {
      await capxVesting.createVesting(beneficiary1.address, VESTING_AMOUNT);
      await time.increase(TOTAL_DURATION);
    });

    it("Should allow owner to pause", async function () {
      await capxVesting.pause();
      expect(await capxVesting.paused()).to.equal(true);
    });

    it("Should prevent claims when paused", async function () {
      await capxVesting.pause();

      await expect(
        capxVesting.connect(beneficiary1).claim()
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow owner to unpause", async function () {
      await capxVesting.pause();
      await capxVesting.unpause();
      expect(await capxVesting.paused()).to.equal(false);

      await capxVesting.connect(beneficiary1).claim();
    });
  });

  describe("Token Recovery", function () {
    it("Should prevent recovery of CAPX tokens", async function () {
      await expect(
        capxVesting.recoverTokens(capxToken.target, 1000)
      ).to.be.revertedWith("Cannot recover vesting tokens");
    });
  });
});
