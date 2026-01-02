// test/tokens.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CAPX and ANGEL Tokens", function () {
  let capx, angel;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const CAPX = await ethers.getContractFactory("CAPX");
    capx = await CAPX.deploy();

    const ANGEL = await ethers.getContractFactory("ANGEL");
    angel = await ANGEL.deploy();
  });

  describe("CAPX Token - Fixed Supply", function () {
    it("Should have correct initial values and fixed supply", async function () {
      expect(await capx.name()).to.equal("CAPShield Token");
      expect(await capx.symbol()).to.equal("CAPX");
      expect(await capx.decimals()).to.equal(18);
      expect(await capx.totalSupply()).to.equal(
        ethers.parseUnits("100000000", 18)
      );
      expect(await capx.getMaxSupply()).to.equal(
        ethers.parseUnits("100000000", 18)
      );
    });

    it("Should allow anyone to burn their own tokens", async function () {
      await capx.transfer(addr1.address, ethers.parseUnits("1000", 18));
      await capx.connect(addr1).burn(ethers.parseUnits("500", 18));
      expect(await capx.balanceOf(addr1.address)).to.equal(
        ethers.parseUnits("500", 18)
      );
    });
  });

  describe("ANGEL Token - No Fixed Supply", function () {
    it("Should allow owner to mint additional tokens", async function () {
      const initialSupply = await angel.totalSupply();
      await angel.mint(addr1.address, ethers.parseUnits("5000000", 18));
      expect(await angel.totalSupply()).to.equal(
        initialSupply + ethers.parseUnits("5000000", 18)
      );
    });

    it("Should prevent non-owners from minting", async function () {
      await expect(
        angel
          .connect(addr1)
          .mint(addr1.address, ethers.parseUnits("1000", 18))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
