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

### Start Proof Server

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
[18:23:54.749] INFO (44131): Deploying RPS contract...
  ⠹ Deploying RPS contract[18:24:17.260] INFO (44131): Deployed RPS contract at: 2a550650cd1af2054caf99349c44ae732266aa89faac0c17339f7069c4401fa4
  ✓ Deploying RPS contract
  Contract deployed at: 2a550650cd1af2054caf99349c44ae732266aa89faac0c17339f7069c4401fa4
```

```bash
──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 2,754,048,400,999,999,998
  Contract: 2a550650cd1af2054caf99349c44ae732266aa89faac0c17339f7069c4401fa4
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
[18:28:14.544] INFO (44131): Committing move 0...
  ⠧ Committing move (Rock) — generating ZK proof[18:28:39.618] INFO (44131): Commit TX 00df5b8772571c5800e28ea8d4530e4e253bffaf11d434c6e0dcc20ae99eee4bac added in block 603146
  ✓ Committing move (Rock) — generating ZK proof

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 2,755,914,354,999,999,997
  Contract: 2a550650cd1af2054caf99349c44ae732266aa89faac0c17339f7069c4401fa4
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 2
[18:31:13.384] INFO (44131): Revealing move...
  ✗ Revealing move — generating ZK proof
  ✗ Reveal failed: Unexpected error executing scoped transaction '<unnamed>': Error: failed assert: Not in committed state


──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 2,757,204,006,999,999,997
  Contract: 2a550650cd1af2054caf99349c44ae732266aa89faac0c17339f7069c4401fa4
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 3
[18:31:18.101] INFO (44131): Checking RPS ledger state...
[18:31:18.406] INFO (44131): RPS state: {"state":0,"game_over":false,"p1_key":"0x84508231...","p2_key":"0x00000000...","p1_joined":true,"p2_joined":false,"p1_commit":"0x46bd84ad...","p2_commit":"0x00000000...","p1_revealed":false,"p2_revealed":false,"p1_move":0,"p2_move":0,"result":0}

  Game State:   waiting
  Game Over:    false
  P1 Joined:   true
  P2 Joined:   false
  P1 Revealed: false
  P2 Revealed: false
  Result:       not_determined


──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 2,757,228,807,999,999,997
  Contract: 2a550650cd1af2054caf99349c44ae732266aa89faac0c17339f7069c4401fa4
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 4
[18:31:23.916] INFO (44131): Goodbye.
```

### Start server

```bash
bun app dev
```