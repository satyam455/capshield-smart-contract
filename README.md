# CAPShield Smart Contracts

Advanced ERC20 token implementations for the CAPShield ecosystem featuring role-based access control, hard cap enforcement, and specialized tokenomics.

---

## Overview

This repository contains two smart contracts built on OpenZeppelin v4.9.6:

* **CAPX (CAPY)**: Core Shield Token with deflationary transfer logic and revenue-based minting
* **ANGEL (SEED)**: Community Reward Token used for incentives, grants, and ecosystem rewards

Both contracts use **AccessControl**, enforce **irreversible hard caps**, support **emergency pause**, and are designed for **multisig governance**.

---

## CAPX Token – Shield Token

### What CAPX Does

CAPX is the protocol’s core value and utility token.
It supports controlled issuance, protocol-aligned revenue minting, and deflation through transfer-based burns.

---

### Important State Variables

* **MAX_SUPPLY**
  Hard cap of 100,000,000 tokens. This value is immutable.

* **totalMinted**
  Tracks all tokens ever minted. Burning does not reduce this value, ensuring the cap is irreversible.

* **treasuryAddress**
  Address that receives protocol fees from transfers.

* **daoAddress**
  Governance address, also exempt from transfer fees.

* **isExemptFromFees**
  Mapping that tracks addresses excluded from transfer fees.

---

### Supply & Minting Logic

* Initial supply is **zero**
* Tokens can only be minted by authorized roles
* Minting is permanently capped by `MAX_SUPPLY`
* Burning reduces circulating supply but does not increase mint capacity

#### Key Mint Functions

* `teamMint(address to, uint256 amount)`
* `treasuryMint(address to, uint256 amount)`
* `daoMint(address to, uint256 amount)`

Each function:

* Requires its respective role
* Enforces the hard cap
* Updates `totalMinted`

---

### Revenue-Based Minting

* `revenueMint(address to, uint256 revenue, uint256 marketValue)`

This function mints tokens using the formula:

```
mintedAmount = revenue / marketValue
```

Constraints:

* Revenue and market value must be greater than zero
* Minted amount must respect the hard cap
* Emits a `RevenueMint` event for transparency

---

### Transfer Fee Mechanics

Every non-exempt transfer applies:

* **1% burn** (permanent supply reduction)
* **1% treasury fee**
* **98% received by the recipient**

Treasury and DAO addresses are fee-exempt.
Admins can manage additional exemptions if required.

---

### Access Control Roles

* **DEFAULT_ADMIN_ROLE** – Manages all roles and critical parameters
* **TEAM_MINTER_ROLE** – Team-controlled issuance
* **TREASURY_MINTER_ROLE** – Treasury and revenue-based issuance
* **DAO_MINTER_ROLE** – DAO-governed issuance
* **PAUSER_ROLE** – Emergency pause control

---

### Safety Features

* Emergency pause blocks transfers and minting
* Hard cap cannot be bypassed
* Burn does not allow reminting
* All sensitive actions emit events

---

## ANGEL Token – Community Reward Token (SEED)

### What ANGEL Does

ANGEL is a community-focused token used for:

* Rewards
* Grants
* Bounties
* Ecosystem incentives

It prioritizes transparency, strict supply control, and auditability.

---

### Important State Variables

* **MAX_SUPPLY**
  Hard cap of 10,000,000,000 tokens.

* **totalMinted**
  Tracks all minted tokens and enforces irreversible supply limits.

---

### Minting System

ANGEL does not allow arbitrary minting.
All minting is role-based and requires a reason.

#### Key Mint Functions

* `rewardMint(address to, uint256 amount, string reason)`
  Mints rewards to a single address with a mandatory reason.

* `batchRewardMint(address[] recipients, uint256[] amounts, string reason)`
  Allows efficient bulk reward distribution.

Rules:

* Amount must be greater than zero
* Recipient cannot be zero address
* Reason cannot be empty
* Hard cap is always enforced

Each mint emits a `RewardMint` event for auditability.

---

### Burn Logic

* Users can burn their own tokens
* `burnFrom` supports allowance-based burning
* Burning reduces total supply
* Burning does **not** increase future mint capacity

---

### Access Control Roles

* **DEFAULT_ADMIN_ROLE** – Full administrative control
* **REWARD_MINTER_ROLE** – Authorized reward distribution
* **PAUSER_ROLE** – Emergency pause control

---

### Pause & Safety

* Pause blocks transfers and minting
* Prevents reward distribution during emergencies
* Supports safe governance intervention

---

## Compilation & Testing

### Compile Contracts

```bash
npx hardhat compile
```

This compiles all contracts under the `contracts/` directory using the configured Solidity version.

---

### Run Tests

```bash
npx hardhat test
```

This runs all test files under the `test/` directory, including:

* `CAPX.test.js`
* `ANGEL.test.js`

These tests validate:

* Deployment correctness
* Access control
* Hard cap enforcement
* Minting and burning behavior
* Transfer logic
* Pause functionality

---

## Summary

* **CAPX** handles protocol value, deflation, and revenue-aligned issuance
* **ANGEL** handles transparent and capped community rewards
* Both contracts are role-driven, cap-safe, and governance-ready

This repository represents a **complete requirement based contracts**, **audit-ready** token system for the CAPShield ecosystem.
