---
name: midnight-test-runner
description: >
  Run and debug Midnight contract tests using Vitest and compact-runtime simulators.
  Use this skill when running contract tests, writing new tests, debugging test failures,
  or understanding the CounterSimulator / CircuitContext pattern.
  Triggers on: "run tests", "test contract", "debug test", "test fails", "vitest",
  "CounterSimulator", "CircuitContext", "compact-runtime", "contract simulator",
  "impureCircuits", "npm run test".
license: MIT
metadata:
  author: mashharuki
  version: "2.1.0"
  compact-runtime-version: "0.15.0"
  reference: "midnightntwrk/example-counter"
---

# Midnight Test Runner

> **Source of truth**: `contract/src/test/` in `midnightntwrk/example-counter`

---

## Project Layout

```
contract/
├── src/
│   ├── counter.compact             # Compact contract
│   ├── managed/counter/            # Compiled artifacts (gitignored, generated)
│   ├── witnesses.ts                # Witness types and implementations
│   └── test/
│       ├── counter.test.ts         # Vitest test file
│       └── counter-simulator.ts    # Circuit simulator using compact-runtime
├── vitest.config.ts
└── package.json
```

---

## Quick Start

```bash
cd contract

# Build first (required before tests)
npm run compact   # Compile Compact → managed/
npm run build     # TypeScript build

# Run tests
npm run test

# Compile + test in one step
npm run test:compile
```

---

## The Simulator Pattern

Midnight contract tests use `@midnight-ntwrk/compact-runtime` to simulate circuit execution without a blockchain.

### Real simulator from example-counter

```typescript
// contract/src/test/counter-simulator.ts
import {
  type CircuitContext,
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  type Ledger,
  ledger,
} from '../managed/counter/contract/index.js';
import { type CounterPrivateState, witnesses } from '../witnesses.js';

export class CounterSimulator {
  readonly contract: Contract<CounterPrivateState>;
  circuitContext: CircuitContext<CounterPrivateState>;

  constructor() {
    this.contract = new Contract<CounterPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ privateCounter: 0 }, '0'.repeat(64))
    );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): CounterPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public increment(): Ledger {
    // impureCircuits are state-modifying circuits
    this.circuitContext = this.contract.impureCircuits.increment(
      this.circuitContext
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }
}
```

### Key concepts

- `createConstructorContext(initialPrivateState, contractAddressHex)` — creates initial circuit context
- `createCircuitContext(address, zswapLocalState, contractState, privateState)` — wraps state into context
- `contract.impureCircuits.<circuitName>(context)` — executes state-modifying circuits
- `ledger(context.currentQueryContext.state)` — reads public ledger state
- `circuitContext.currentPrivateState` — reads private state

---

## Actual Test File

```typescript
// contract/src/test/counter.test.ts
import { CounterSimulator } from './counter-simulator.js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, it, expect } from 'vitest';

setNetworkId('undeployed'); // Required before any SDK operations

describe('Counter smart contract', () => {
  it('generates initial ledger state deterministically', () => {
    const simulator0 = new CounterSimulator();
    const simulator1 = new CounterSimulator();
    expect(simulator0.getLedger()).toEqual(simulator1.getLedger());
  });

  it('properly initializes ledger state and private state', () => {
    const simulator = new CounterSimulator();
    expect(simulator.getLedger().round).toEqual(0n);
    expect(simulator.getPrivateState()).toEqual({ privateCounter: 0 });
  });

  it('increments the counter correctly', () => {
    const simulator = new CounterSimulator();
    const nextLedgerState = simulator.increment();
    expect(nextLedgerState.round).toEqual(1n);
    expect(simulator.getPrivateState()).toEqual({ privateCounter: 0 });
  });
});
```

---

## Writing New Tests

### Template for a new test suite

```typescript
import { MyContractSimulator } from './my-simulator.js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { describe, it, expect, beforeEach } from 'vitest';

setNetworkId('undeployed');

describe('My Contract', () => {
  let simulator: MyContractSimulator;

  beforeEach(() => {
    simulator = new MyContractSimulator();
  });

  it('initializes correctly', () => {
    const ledger = simulator.getLedger();
    expect(ledger.someField).toEqual(expectedValue);
  });

  it('rejects invalid operations', () => {
    expect(() => {
      simulator.someCircuitThatShouldFail();
    }).toThrow('Expected error message');
  });
});
```

### Template for a new simulator

```typescript
import {
  type CircuitContext,
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  type Ledger,
  ledger,
} from '../managed/my-contract/contract/index.js';
import { type MyPrivateState, witnesses } from '../witnesses.js';

export class MyContractSimulator {
  readonly contract: Contract<MyPrivateState>;
  circuitContext: CircuitContext<MyPrivateState>;

  constructor() {
    this.contract = new Contract<MyPrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(
        createConstructorContext({ /* initial private state */ }, '0'.repeat(64))
      );
    this.circuitContext = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): MyPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public myCircuit(arg: bigint): Ledger {
    this.circuitContext = this.contract.impureCircuits.myCircuit(
      this.circuitContext, arg
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }
}
```

---

## Two-Party Simulator Pattern (verified: Rock-Paper-Scissors)

`CounterSimulator` above models a single caller. For a contract shared by **two independent
callers with separate private state** (e.g. a two-player game where each player has their own
secret move/salt), a single `CircuitContext` isn't enough — each player needs their own
private state and zswap local state, while both must operate against the **same** shared
ledger state. This is the real simulator from `midnight-rps-sample-app`
(`pkgs/contract/src/test/rps-simulator.ts`), verified against a live commit-reveal contract:

```typescript
import {
  type CircuitContext, type ChargedState, type EncodedZswapLocalState,
  sampleContractAddress, createConstructorContext, createCircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger, ledger, type Witnesses, Move } from '../managed/rps/contract/index.js';
import { type RpsPrivateState, rpsWitnesses } from '../rps-witnesses.js';

export class RpsSimulator {
  private readonly contract: Contract<RpsPrivateState>;
  private p1PrivateState: RpsPrivateState;
  private p2PrivateState: RpsPrivateState;
  private p1ZswapState: EncodedZswapLocalState;
  private p2ZswapState: EncodedZswapLocalState;
  private sharedState: ChargedState;                    // ← the ONE ledger both players act on
  private readonly contractAddress = sampleContractAddress();

  constructor(p1SecretKey = new Uint8Array(32).fill(1), p2SecretKey = new Uint8Array(32).fill(2)) {
    // Single contract instance — the witnesses object reads from whichever
    // privateState is passed into the context for that call, so one Contract
    // instance safely serves both players.
    this.contract = new Contract<RpsPrivateState>(rpsWitnesses as unknown as Witnesses<RpsPrivateState>);

    this.p1PrivateState = { secretKey: p1SecretKey, myMove: null, mySalt: null };
    this.p2PrivateState = { secretKey: p2SecretKey, myMove: null, mySalt: null };

    // initialState() is deterministic given the same constructor args, so both players'
    // initial ledger state is identical — arbitrarily keep P1's as canonical.
    const p1Init = this.contract.initialState(createConstructorContext(this.p1PrivateState, '0'.repeat(64)));
    const p2Init = this.contract.initialState(createConstructorContext(this.p2PrivateState, '0'.repeat(64)));
    this.p1ZswapState = p1Init.currentZswapLocalState;
    this.p2ZswapState = p2Init.currentZswapLocalState;
    this.sharedState = p1Init.currentContractState.data;
  }

  getLedger(): Ledger { return ledger(this.sharedState); }

  // Build a context for a given player by combining THAT player's private/zswap state
  // with the CURRENT shared ledger state (not each player's own stale copy).
  private p1Ctx(ps: RpsPrivateState): CircuitContext<RpsPrivateState> {
    return createCircuitContext(this.contractAddress, this.p1ZswapState, this.sharedState, ps);
  }
  private p2Ctx(ps: RpsPrivateState): CircuitContext<RpsPrivateState> {
    return createCircuitContext(this.contractAddress, this.p2ZswapState, this.sharedState, ps);
  }

  p1Commit(move: Move, salt = new Uint8Array(32).fill(0xaa)): Ledger {
    const ps: RpsPrivateState = { ...this.p1PrivateState, myMove: move as unknown as number, mySalt: salt };
    const result = this.contract.impureCircuits.commit(this.p1Ctx(ps));
    // Write back all three pieces of state from the result — private, zswap, AND shared —
    // so player 2's next call sees player 1's commit already reflected in the ledger.
    this.p1PrivateState = result.context.currentPrivateState;
    this.p1ZswapState = result.context.currentZswapLocalState;
    this.sharedState = result.context.currentQueryContext.state;
    return ledger(this.sharedState);
  }

  p2Commit(move: Move, salt = new Uint8Array(32).fill(0xbb)): Ledger {
    const ps: RpsPrivateState = { ...this.p2PrivateState, myMove: move as unknown as number, mySalt: salt };
    const result = this.contract.impureCircuits.commit(this.p2Ctx(ps));
    this.p2PrivateState = result.context.currentPrivateState;
    this.p2ZswapState = result.context.currentZswapLocalState;
    this.sharedState = result.context.currentQueryContext.state;
    return ledger(this.sharedState);
  }

  // p1Reveal()/p2Reveal() follow the identical write-back pattern as p1Commit/p2Commit.
}
```

Test usage reads like a real two-player game:

```typescript
const sim = new RpsSimulator();
sim.p1Commit(Move.rock);
sim.p2Commit(Move.paper);
sim.p1Reveal();
sim.p2Reveal();
expect(sim.getLedger().result).toEqual(GameResult.player2_wins);
```

**The one rule that makes this work**: after every circuit call, write back all three state
pieces the result contains — `currentPrivateState`, `currentZswapLocalState`, and
`currentQueryContext.state` (the shared ledger) — and always build the *next* context from
the freshest `sharedState`, not a per-player cached copy. Forgetting to propagate
`sharedState` between calls is the most common bug when writing this kind of test: it makes
the second player's `commit()` operate against a stale ledger where the first player never
joined, so the contract behaves as if only one player has committed.

---

## Common Test Commands

```bash
# Run all tests
npm run test

# Compile Compact first, then test
npm run test:compile

# Run specific test file
npx vitest run src/test/counter.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose -t "increments"

# Watch mode (re-runs on file changes)
npx vitest
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module '../managed/counter/contract/index.js'` | Contract not compiled | `npm run compact && npm run build` |
| `Type 'number' is not assignable to type 'bigint'` | Use `n` suffix or `BigInt()` | `expect(x).toEqual(1n)` |
| Test hangs | Promise not resolved | Check for missing `await` |
| `setNetworkId` not called error | Network not initialized | Add `setNetworkId('undeployed')` at top of test file |
| `impureCircuits` property missing | Wrong import | Import from `../managed/<name>/contract/index.js` |

---

## Best Practices

1. Call `setNetworkId('undeployed')` once at the module level, outside `describe`
2. Use `BigInt` (`0n`, `1n`) for all ledger values — Compact integers map to `bigint`
3. Use `beforeEach` to get a fresh simulator for each test (avoids state leakage)
4. Test both happy paths and assertions (`.toThrow('message')`)
5. The simulator runs circuits synchronously — no `await` needed for circuit calls

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [compact-runtime on npm](https://www.npmjs.com/package/@midnight-ntwrk/compact-runtime)
- [example-counter test source](https://github.com/midnightntwrk/example-counter/tree/main/contract/src/test)
