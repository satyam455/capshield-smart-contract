const { expect } = require("chai");
const hre = require("hardhat");

describe("CAPX Token - Shield Token", function () {
  let capx;
  let owner, treasury, dao, team, user1, user2, user3;
  let TEAM_MINTER_ROLE, TREASURY_MINTER_ROLE, DAO_MINTER_ROLE, PAUSER_ROLE;

  beforeEach(async function () {
    [owner, treasury, dao, team, user1, user2, user3] = await hre.ethers.getSigners();

    const CAPX = await hre.ethers.getContractFactory("CAPX");
    capx = await CAPX.deploy(treasury.address, dao.address, owner.address);

    TEAM_MINTER_ROLE = await capx.TEAM_MINTER_ROLE();
    TREASURY_MINTER_ROLE = await capx.TREASURY_MINTER_ROLE();
    DAO_MINTER_ROLE = await capx.DAO_MINTER_ROLE();
    PAUSER_ROLE = await capx.PAUSER_ROLE();
  });

  describe("Deployment", function () {
    it("Should have correct name and symbol", async function () {
      expect(await capx.name()).to.equal("CAPShield Token");
      expect(await capx.symbol()).to.equal("CAPY");
      expect(await capx.decimals()).to.equal(18);
    });

    it("Should start with zero total supply", async function () {
      expect(await capx.totalSupply()).to.equal(0);
      expect(await capx.totalMinted()).to.equal(0);
    });

    it("Should have correct MAX_SUPPLY", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      expect(maxSupply).to.equal(hre.ethers.parseEther("100000000"));
    });

    it("Should set treasury and DAO addresses correctly", async function () {
      expect(await capx.treasuryAddress()).to.equal(treasury.address);
      expect(await capx.daoAddress()).to.equal(dao.address);
    });

    it("Should set treasury and DAO as fee exempt", async function () {
      expect(await capx.isExemptFromFees(treasury.address)).to.be.true;
      expect(await capx.isExemptFromFees(dao.address)).to.be.true;
    });

    it("Should grant all roles to admin", async function () {
      const DEFAULT_ADMIN_ROLE = await capx.DEFAULT_ADMIN_ROLE();
      expect(await capx.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await capx.hasRole(TEAM_MINTER_ROLE, owner.address)).to.be.true;
      expect(await capx.hasRole(TREASURY_MINTER_ROLE, owner.address)).to.be.true;
      expect(await capx.hasRole(DAO_MINTER_ROLE, owner.address)).to.be.true;
      expect(await capx.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Role-Based Minting", function () {
    it("Should allow TEAM_MINTER_ROLE to mint tokens", async function () {
      const amount = hre.ethers.parseEther("1000");
      await capx.teamMint(user1.address, amount);

      expect(await capx.balanceOf(user1.address)).to.equal(amount);
      expect(await capx.totalMinted()).to.equal(amount);
    });

    it("Should allow TREASURY_MINTER_ROLE to mint tokens", async function () {
      const amount = hre.ethers.parseEther("5000");
      await capx.treasuryMint(user1.address, amount);

      expect(await capx.balanceOf(user1.address)).to.equal(amount);
      expect(await capx.totalMinted()).to.equal(amount);
    });

    it("Should allow DAO_MINTER_ROLE to mint tokens", async function () {
      const amount = hre.ethers.parseEther("2000");
      await capx.daoMint(user1.address, amount);

      expect(await capx.balanceOf(user1.address)).to.equal(amount);
      expect(await capx.totalMinted()).to.equal(amount);
    });

    it("Should prevent unauthorized minting", async function () {
      const amount = hre.ethers.parseEther("1000");

      await expect(
        capx.connect(user1).teamMint(user2.address, amount)
      ).to.be.reverted;

      await expect(
        capx.connect(user1).treasuryMint(user2.address, amount)
      ).to.be.reverted;

      await expect(
        capx.connect(user1).daoMint(user2.address, amount)
      ).to.be.reverted;
    });
  });

  describe("Hard Cap Enforcement", function () {
    it("Should allow minting up to MAX_SUPPLY", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      await capx.teamMint(user1.address, maxSupply);

      expect(await capx.totalMinted()).to.equal(maxSupply);
      expect(await capx.balanceOf(user1.address)).to.equal(maxSupply);
    });

    it("Should prevent minting beyond MAX_SUPPLY", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      await capx.teamMint(user1.address, maxSupply);

      await expect(
        capx.teamMint(user2.address, 1)
      ).to.be.revertedWith("Minting would exceed max supply");
    });

    it("Should track remaining mintable supply correctly", async function () {
      const amount = hre.ethers.parseEther("10000000");
      await capx.teamMint(user1.address, amount);

      const remaining = await capx.remainingMintableSupply();
      const maxSupply = await capx.MAX_SUPPLY();

      expect(remaining).to.equal(maxSupply - amount);
    });

    it("Should not allow burning to increase mint capacity", async function () {
      const amount = hre.ethers.parseEther("1000");
      await capx.teamMint(user1.address, amount);

      const mintedBefore = await capx.totalMinted();

      await capx.connect(user1).burn(hre.ethers.parseEther("500"));

      const mintedAfter = await capx.totalMinted();
      expect(mintedAfter).to.equal(mintedBefore);
    });
  });

  describe("Revenue-Based Minting", function () {
    it("Should mint tokens based on revenue formula", async function () {
      const revenue = hre.ethers.parseEther("10000");
      const marketValue = hre.ethers.parseEther("1");

      await capx.revenueMint(user1.address, revenue, marketValue);

      const expectedAmount = (revenue * hre.ethers.parseEther("1")) / marketValue;
      expect(await capx.balanceOf(user1.address)).to.equal(expectedAmount);
    });

    it("Should emit RevenueMint event", async function () {
      const revenue = hre.ethers.parseEther("5000");
      const marketValue = hre.ethers.parseEther("1");
      const expectedAmount = (revenue * hre.ethers.parseEther("1")) / marketValue;

      await expect(capx.revenueMint(user1.address, revenue, marketValue))
        .to.emit(capx, "RevenueMint")
        .withArgs(user1.address, expectedAmount, revenue, marketValue);
    });

    it("Should revert if revenue is zero", async function () {
      await expect(
        capx.revenueMint(user1.address, 0, hre.ethers.parseEther("1"))
      ).to.be.revertedWith("Revenue must be greater than 0");
    });

    it("Should revert if market value is zero", async function () {
      await expect(
        capx.revenueMint(user1.address, hre.ethers.parseEther("1000"), 0)
      ).to.be.revertedWith("Market value must be greater than 0");
    });

    it("Should respect hard cap in revenue minting", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      const revenue = maxSupply * 2n;
      const marketValue = hre.ethers.parseEther("1");

      await expect(
        capx.revenueMint(user1.address, revenue, marketValue)
      ).to.be.revertedWith("Minting would exceed max supply");
    });
  });

  describe("Transfer Hooks (1% Burn + 1% Treasury)", function () {
    beforeEach(async function () {
      await capx.teamMint(user1.address, hre.ethers.parseEther("10000"));
    });

    it("Should apply 1% burn and 1% treasury fee on transfers", async function () {
      const transferAmount = hre.ethers.parseEther("1000");
      const burnAmount = (transferAmount * 1n) / 100n;
      const treasuryAmount = (transferAmount * 1n) / 100n;
      const recipientAmount = transferAmount - burnAmount - treasuryAmount;

      const initialSupply = await capx.totalSupply();

      await capx.connect(user1).transfer(user2.address, transferAmount);

      expect(await capx.balanceOf(user2.address)).to.equal(recipientAmount);
      expect(await capx.balanceOf(treasury.address)).to.equal(treasuryAmount);

      const finalSupply = await capx.totalSupply();
      expect(initialSupply - finalSupply).to.equal(burnAmount);
    });

    it("Should emit TreasuryFee event on transfer", async function () {
      const transferAmount = hre.ethers.parseEther("1000");
      const treasuryAmount = (transferAmount * 1n) / 100n;

      await expect(capx.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(capx, "TreasuryFee")
        .withArgs(user1.address, treasury.address, treasuryAmount);
    });

    it("Should exempt treasury from fees", async function () {
      await capx.teamMint(treasury.address, hre.ethers.parseEther("1000"));

      const transferAmount = hre.ethers.parseEther("500");
      await capx.connect(treasury).transfer(user1.address, transferAmount);

      expect(await capx.balanceOf(user1.address)).to.equal(
        hre.ethers.parseEther("10000") + transferAmount
      );
    });

    it("Should exempt DAO from fees", async function () {
      await capx.teamMint(dao.address, hre.ethers.parseEther("1000"));

      const transferAmount = hre.ethers.parseEther("500");
      await capx.connect(dao).transfer(user1.address, transferAmount);

      expect(await capx.balanceOf(user1.address)).to.equal(
        hre.ethers.parseEther("10000") + transferAmount
      );
    });
  });

  describe("Exemption Management", function () {
    it("Should allow admin to set exemptions", async function () {
      await capx.setExemption(user1.address, true);
      expect(await capx.isExemptFromFees(user1.address)).to.be.true;

      await capx.setExemption(user1.address, false);
      expect(await capx.isExemptFromFees(user1.address)).to.be.false;
    });

    it("Should emit ExemptionUpdated event", async function () {
      await expect(capx.setExemption(user1.address, true))
        .to.emit(capx, "ExemptionUpdated")
        .withArgs(user1.address, true);
    });

    it("Should prevent non-admin from setting exemptions", async function () {
      await expect(
        capx.connect(user1).setExemption(user2.address, true)
      ).to.be.reverted;
    });
  });

  describe("Address Updates", function () {
    it("Should allow admin to update treasury address", async function () {
      await expect(capx.updateTreasuryAddress(user3.address))
        .to.emit(capx, "TreasuryAddressUpdated")
        .withArgs(treasury.address, user3.address);

      expect(await capx.treasuryAddress()).to.equal(user3.address);
      expect(await capx.isExemptFromFees(user3.address)).to.be.true;
      expect(await capx.isExemptFromFees(treasury.address)).to.be.false;
    });

    it("Should allow admin to update DAO address", async function () {
      await expect(capx.updateDAOAddress(user3.address))
        .to.emit(capx, "DAOAddressUpdated")
        .withArgs(dao.address, user3.address);

      expect(await capx.daoAddress()).to.equal(user3.address);
      expect(await capx.isExemptFromFees(user3.address)).to.be.true;
      expect(await capx.isExemptFromFees(dao.address)).to.be.false;
    });

    it("Should prevent updating to zero address", async function () {
      await expect(
        capx.updateTreasuryAddress(hre.ethers.ZeroAddress)
      ).to.be.revertedWith("Treasury address cannot be zero");

      await expect(
        capx.updateDAOAddress(hre.ethers.ZeroAddress)
      ).to.be.revertedWith("DAO address cannot be zero");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow PAUSER_ROLE to pause contract", async function () {
      await capx.pause();
      expect(await capx.paused()).to.be.true;
    });

    it("Should allow PAUSER_ROLE to unpause contract", async function () {
      await capx.pause();
      await capx.unpause();
      expect(await capx.paused()).to.be.false;
    });

    it("Should prevent transfers when paused", async function () {
      await capx.teamMint(user1.address, hre.ethers.parseEther("1000"));
      await capx.pause();

      await expect(
        capx.connect(user1).transfer(user2.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent minting when paused", async function () {
      await capx.pause();

      await expect(
        capx.teamMint(user1.address, hre.ethers.parseEther("1000"))
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent non-pauser from pausing", async function () {
      await expect(
        capx.connect(user1).pause()
      ).to.be.reverted;
    });
  });

  describe("Burn Functionality", function () {
    beforeEach(async function () {
      await capx.teamMint(user1.address, hre.ethers.parseEther("10000"));
    });

    it("Should allow users to burn their own tokens", async function () {
      const burnAmount = hre.ethers.parseEther("1000");
      await capx.connect(user1).burn(burnAmount);

      expect(await capx.balanceOf(user1.address)).to.equal(
        hre.ethers.parseEther("9000")
      );
    });

    it("Should reduce total supply when burning", async function () {
      const initialSupply = await capx.totalSupply();
      const burnAmount = hre.ethers.parseEther("1000");

      await capx.connect(user1).burn(burnAmount);

      expect(await capx.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("Should allow burnFrom with allowance", async function () {
      const burnAmount = hre.ethers.parseEther("500");
      await capx.connect(user1).approve(user2.address, burnAmount);
      await capx.connect(user2).burnFrom(user1.address, burnAmount);

      expect(await capx.balanceOf(user1.address)).to.equal(
        hre.ethers.parseEther("9500")
      );
    });
  });

  describe("View Functions", function () {
    it("Should return correct canMint status", async function () {
      const amount = hre.ethers.parseEther("1000000");
      expect(await capx.canMint(amount)).to.be.true;

      const maxSupply = await capx.MAX_SUPPLY();
      await capx.teamMint(user1.address, maxSupply);

      expect(await capx.canMint(1)).to.be.false;
    });

    it("Should return correct remaining mintable supply", async function () {
      const maxSupply = await capx.MAX_SUPPLY();
      expect(await capx.remainingMintableSupply()).to.equal(maxSupply);

      const mintAmount = hre.ethers.parseEther("10000000");
      await capx.teamMint(user1.address, mintAmount);

      expect(await capx.remainingMintableSupply()).to.equal(maxSupply - mintAmount);
    });
  });
});
