# midnight-rps-sample-app

Midnight RPS sample dApp

## Enviroment Info

```bash
compact 0.2.0
bun 1.3.13
node 23.3.0
```

## How to work

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

### Deploy Contract to PreProd Network

If you don't have testnet NIGHT Token, you can get some token from below site.

https://faucet.preprod.midnight.network/

```bash
bun cli preprod-pts
```

Deployed Contract Address info

```bash
[15:32:01.562] INFO (31430): Deploying RPS contract...
  ⠏ Deploying RPS contract[15:32:26.865] INFO (31430): Deployed RPS contract at: 250c375e0acae46fff6a1edb0a3f8071fd827984812a61e0e923ce6159b1d64a
  ✓ Deploying RPS contract
  Contract deployed at: 250c375e0acae46fff6a1edb0a3f8071fd827984812a61e0e923ce6159b1d64a
```

```bash
──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 2,662,655,384,999,999,997
  Contract: 250c375e0acae46fff6a1edb0a3f8071fd827984812a61e0e923ce6159b1d64a
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
```

### Start server

```bash
bun app dev
```