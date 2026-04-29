---
name: midnight-deploy
description: >
  Deploy and run Midnight smart contracts on Preprod, Preview, or Standalone (local Docker) networks.
  Use this skill when deploying contracts, understanding the tNight/DUST fee flow, starting proof servers,
  or setting up local infrastructure for testing.
  Triggers on: "deploy contract", "preprod", "preview", "standalone", "proof server", "tNight", "DUST",
  "faucet", "midnight infrastructure", "start local node", "npm run preprod", "npm run standalone".
  Always use when the user asks how to run or deploy a Midnight dApp for the first time.
license: MIT
metadata:
  author: mashharuki
  version: "2.0.0"
  midnight-js-version: "4.0.4"
  compact-toolchain-version: "0.30.0"
  reference: "midnightntwrk/example-counter"
---

# Midnight Deploy Guide

> **Source of truth**: `midnightntwrk/example-counter`

---

## Quick Overview — 3 Target Networks

| Network | Description | Start command (from `counter-cli/`) |
|---------|-------------|--------------------------------------|
| **Preprod** | Public testnet ✅ recommended | `npm run preprod-ps` |
| **Preview** | Public preview testnet | `npm run preview-ps` |
| **Standalone** | Fully local (Docker) | `npm run standalone` |

---

## Prerequisites

```bash
# Node.js v22.15+
node --version

# Docker with docker compose (for proof server / standalone)
docker compose version

# Compact toolchain
compact compile --version   # should be 0.30.0
```

### Install Compact toolchain (first time)

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
source $HOME/.local/bin/env
compact update 0.30.0
```

---

## Step 1: Build the Contract

```bash
cd contract
npm run compact    # Compile Compact → managed/ (ZK circuits + WASM)
npm run build      # TypeScript build → dist/
npm run test       # Verify tests pass
cd ..
```

Expected compact output:
```
Compiling 1 circuits:
  circuit "increment" (k=10, rows=29)
```

> First run downloads zero-knowledge parameters (~500MB, one-time only).

---

## Step 2: Run on Preprod (Recommended)

### Option A — auto-start proof server (simplest)

```bash
cd counter-cli
npm run preprod-ps
```

This pulls the proof server Docker image (`midnightntwrk/proof-server:8.0.3`), starts it, then launches the CLI.

### Option B — manual proof server

Terminal 1:
```bash
cd counter-cli
docker compose -f proof-server.yml up
# Wait for: INFO actix_server::server: starting service: "actix-web-service-0.0.0.0:6300"
```

Terminal 2:
```bash
cd counter-cli
npm run preprod
```

---

## Step 3: Create / Restore Wallet

The CLI uses a **headless wallet** (not a browser wallet like Lace).

```
[1] Create a new wallet   ← generates a 64-char hex seed
[2] Restore from seed     ← enter previously saved seed
```

**Save the seed** — it cannot be recovered if lost.

Your unshielded address is displayed:
```
  Unshielded Address (send tNight here):
  mn_addr_preprod1...
```

---

## Step 4: Get tNight from Faucet

Visit: `https://faucet.preprod.midnight.network/`

1. Paste your unshielded address (`mn_addr_preprod1...`)
2. Request tNight tokens
3. The CLI detects incoming funds automatically

> For Preview: `https://faucet.preview.midnight.network/`

---

## Step 5: Wait for DUST Generation

After receiving tNight, the CLI automatically:
1. Registers your NIGHT UTXOs for dust generation
2. Waits for DUST to appear

**DUST** is the non-transferable fee token required for all Midnight transactions.
It is generated over time from registered NIGHT UTXOs.

```
  ✓ Registering 1 NIGHT UTXO(s) for dust generation
  ✓ Waiting for dust tokens to generate
  ✓ Configuring providers
```

Once DUST is available, the contract menu appears:
```
  [1] Deploy a new counter contract
  [2] Join an existing counter contract
  [3] Monitor DUST balance
  [4] Exit
```

---

## Step 6: Deploy or Join

### Deploy new contract

Choose `[1]`. After proving + balancing + submission:
```
  ✓ Deploying counter contract
  Contract deployed at: <contract-address>
```

**Save the contract address** to rejoin in future sessions.

### Join existing contract

Choose `[2]`, enter the saved contract address.

---

## Step 7: Interact

```
  [1] Increment counter      ← submits a real tx
  [2] Display current value  ← reads from blockchain
  [3] Exit
```

---

## Standalone (Full Local Stack)

Runs the entire Midnight stack locally via Docker Compose.

```bash
cd counter-cli
npm run standalone
```

Docker images used (`standalone.yml`):
| Service | Image |
|---------|-------|
| Proof Server | `midnightntwrk/proof-server:8.0.3` |
| Indexer | `midnightntwrk/indexer-standalone:4.0.0` |
| Node | `midnightntwrk/midnight-node:0.22.3` |

Endpoints (standalone):
- Node: `http://127.0.0.1:9944`
- Indexer: `http://127.0.0.1:8088/api/v3/graphql`
- Proof Server: `http://127.0.0.1:6300`
- NetworkId: `undeployed`

---

## Network Endpoints Reference

```typescript
// Preprod
{ networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v3/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  proofServer: 'http://127.0.0.1:6300' }

// Preview
{ networkId: 'preview',
  indexer: 'https://indexer.preview.midnight.network/api/v3/graphql',
  indexerWS: 'wss://indexer.preview.midnight.network/api/v3/graphql/ws',
  node: 'https://rpc.preview.midnight.network',
  proofServer: 'http://127.0.0.1:6300' }

// Standalone
{ networkId: 'undeployed',
  indexer: 'http://127.0.0.1:8088/api/v3/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
  node: 'http://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300' }
```

---

## DUST Monitor

While waiting for DUST, choose `[3]` to monitor:

```
[10:20:03 PM] DUST: 471,219,000,000,000 (1 coins, 0 pending) | NIGHT: 1 UTXOs, 1 registered | ✓ ready to deploy
```

Status meanings:
- `accruing...` — DUST is generating
- `waiting for generation...` — UTXOs registered, DUST not yet arrived
- `no NIGHT registered` — need to fund wallet first
- `⚠ locked by pending tx` — restart the app to release locked coins

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `compact: command not found` | `source $HOME/.local/bin/env` |
| `connect ECONNREFUSED 127.0.0.1:6300` | Start proof server: `docker compose -f proof-server.yml up` |
| Proof server hangs on Mac ARM | Docker Desktop → Settings → General → Virtual Machine Options → Docker VMM |
| `Failed to clone intent` | Known wallet SDK bug — already worked around in example-counter |
| DUST balance 0 after failed deploy | Restart the app to release locked DUST coins |
| Wallet shows 0 balance after faucet | Wait for sync; check you sent to the unshielded address |
| `Could not find a working container runtime` | Start Docker Desktop |
| Tests fail with `Cannot find module` | Build first: `cd contract && npm run compact && npm run build` |

---

## Deploy Checklist

- [ ] Contract compiled: `cd contract && npm run compact && npm run build`
- [ ] Tests passing: `cd contract && npm run test`
- [ ] Docker running (for proof server)
- [ ] Proof server started (or use `*-ps` npm script)
- [ ] Wallet funded with tNight from faucet
- [ ] DUST generated (> 0)
- [ ] Contract address saved

---

## References

- [Midnight Docs](https://docs.midnight.network/)
- [Preprod Faucet](https://faucet.preprod.midnight.network/)
- [Preview Faucet](https://faucet.preview.midnight.network/)
- [example-counter repo](https://github.com/midnightntwrk/example-counter)
