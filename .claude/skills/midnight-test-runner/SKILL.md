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
  version: "2.0.0"
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
