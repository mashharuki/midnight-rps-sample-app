# midnight-rps-sample-app

Midnight RPS sample dApp

## Overview

midnight-rps-sample-app is a sample Rock-Paper-Scissors dApp project built on Midnight, a privacy-focused blockchain.

### Key Features

- **Fair Gameplay via Zero-Knowledge Proofs (ZK Proofs)**  
  The app utilizes a "commit/reveal" scheme powered by Compact smart contracts. Players commit to their move (Rock, Paper, or Scissors) by submitting a hashed value. Once all players have committed, the moves are revealed. This ensures a tamper-proof gaming experience where "sniping" or reacting to an opponent's move is impossible.

- **Powered by the Midnight Blockchain**  
  Contracts are deployed on the Midnight PreProd testnet, with all transactions recorded on-chain.

- **Full-Stack Architecture**  
  | Package | Role |
  |---|---|
  | `pkgs/contract` | Smart contracts written in the Compact language |
  | `pkgs/cli` | CLI tools for contract deployment and interaction |
  | `pkgs/app` | Frontend UI built with React + Vite |

- **Lace Wallet Integration**  
  Connects with Lace Wallet via the `@midnight-ntwrk/dapp-connector-api` for secure signing and transaction processing.

### Game Flow

1. **Commit Phase** — Each player commits their move and a salt to the blockchain as a hash (generating a ZK Proof).
2. **Reveal Phase** — Both players reveal their previously committed moves.
3. **Settlement** — The contract determines the outcome（`player1_wins` / `player2_wins` / `draw`）and records it on-chain.

## Enviroment Info

```bash
Docker version 27.4.0
compact 0.2.0
bun 1.3.13
node 23.3.0
```

## Application Image

![](./docs/0.png)

![](./docs/1.png)

![](./docs/2.png)

![](./docs/3.png)

![](./docs/4.png)

![](./docs/5.png)

## How to work

### Install Lace Wallet to your browser

If you have not yet installed Lace Wallet, you must go to below page & need to install Lace Wallet

https://www.lace.io/

Next, you need to create wallet account of Midnight

> Please switch to PreProd Network

### Install

```bash
bun install
```

### Build

```bash
bun contract compact
bun cli build
bun app build
```

### Start Proof Server

> you must set version 8.0.3

```bash
docker run -d -p 127.0.0.1:6300:6300 midnightntwrk/proof-server:8.0.3 midnight-proof-server           
```

### Deploy Contract to PreProd Network

If you don't have testnet NIGHT Token, you can get some token from below site.

https://faucet.preprod.midnight.network/

```bash
bun cli preprod-pts
```

Deployed Contract Address info

```bash
[19:24:25.997] INFO (40223): Deploying RPS contract...
  ⠇ Deploying RPS contract[19:24:51.416] INFO (40223): Deployed RPS contract at: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
  ✓ Deploying RPS contract
  Contract deployed at: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
```

```bash
──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,497,759,478,999,999,996
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 1

──────────────────────────────────────────────────────────────
  Select your move
──────────────────────────────────────────────────────────────
  [1] Rock     🪨
  [2] Paper    🖐
  [3] Scissors ✌️
──────────────────────────────────────────────────────────────
> 1
[19:36:19.509] INFO (40223): Committing move 0...
  ⠸ Committing move (Rock) — generating ZK proof[19:36:45.473] INFO (40223): Commit TX 0072b7ad5d6127b3e6d02373ccd967c7329b2ca7a8be35d099f44ebb6736728cca added in block 618227
  ✓ Committing move (Rock) — generating ZK proof

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,503,362,116,999,999,995
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 2
[19:37:05.494] INFO (40223): Revealing move...
  ⠇ Revealing move — generating ZK proof[19:37:33.105] INFO (40223): Reveal TX 00ba3dd2c40736337619c979afeb2210d8b36fc917a93e403a90b1378f07eb680e added in block 618235
  ✓ Revealing move — generating ZK proof

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,503,458,932,999,999,994
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,504,021,088,999,999,994
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 3
[19:38:49.770] INFO (40223): Checking RPS ledger state...
[19:38:50.631] INFO (40223): RPS state: {"state":2,"game_over":true,"p1_key":"0xc3625c1f...","p2_key":"0x12c4698e...","p1_joined":true,"p2_joined":true,"p1_commit":"0x9accc673...","p2_commit":"0x7516506b...","p1_revealed":true,"p2_revealed":true,"p1_move":1,"p2_move":0,"result":1}

  Game State:   finished
  Game Over:    true
  P1 Joined:   true
  P2 Joined:   true
  P1 Revealed: true
  P2 Revealed: true
  Result:       player1_wins


──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,504,095,491,999,999,994
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
```

### Start server

```bash
bun app dev
```