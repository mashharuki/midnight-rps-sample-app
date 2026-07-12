---
name: midnight-compact-guide
description: Comprehensive guide to writing Compact smart contracts for Midnight Network. Use this skill when writing, reviewing, debugging, or learning Compact code. Triggers on "write a contract", "Compact syntax", "Midnight smart contract", "ledger state", "circuit function", or "ZK proof".
license: MIT
metadata:
  author: mashharuki
  version: "2.3.0"
  compact-toolchain-version: "0.30.0"
  compact-version: "0.20+"
---

# Midnight Compact Language Reference (v0.19+)

> **CRITICAL**: This reference is derived from **actual compiling contracts** in the Midnight ecosystem (MeshJS starter template). Always verify syntax against this reference before generating contracts.

## Quick Start Template

Use this as a starting point - it compiles successfully:

```compact
pragma language_version >= 0.20;

import CompactStandardLibrary;

// Ledger state (individual declarations, NOT a block)
export ledger counter: Counter;
export ledger owner: Bytes<32>;

// Witness for private/off-chain data (declaration only)
witness local_secret_key(): Bytes<32>;

// Circuit (returns [] not Void)
export circuit increment(): [] {
  counter.increment(1);
}
```

---

## 1. Pragma (Version Declaration)

**CORRECT** - simple minimum version:
```compact
pragma language_version >= 0.19;
```

**WRONG** - these will cause issues:
```compact
pragma language_version >= 0.14.0;           // ❌ outdated version
pragma language_version >= 0.16 && <= 0.18;  // ❌ outdated, use >= 0.19
```

---

## 2. Imports

Always import the standard library:
```compact
import CompactStandardLibrary;
```

For modular code:
```compact
import "path/to/module";
import { SomeType } from "other/module";
```

---

## 3. Ledger Declarations

**CORRECT** - individual declarations with `export ledger`:
```compact
export ledger counter: Counter;
export ledger owner: Bytes<32>;
export ledger balances: Map<Bytes<32>, Uint<64>>;

// Private state (off-chain only)
ledger secretValue: Field;  // no export = private
```

**WRONG** - block syntax is DEPRECATED:
```compact
// ❌ This causes parse error: found "{" looking for an identifier
ledger {
  counter: Counter;
  owner: Bytes<32>;
}
```

### Ledger Modifiers

```compact
export ledger publicData: Field;           // Public, readable by anyone
export sealed ledger immutableData: Field; // Set once in constructor, cannot change
ledger privateData: Field;                 // Private, not exported
```

---

## 4. Data Types

### Primitive Types

| Type | Description | Example |
|------|-------------|---------|
| `Field` | Finite field element (basic numeric) | `amount: Field` |
| `Boolean` | True or false | `isActive: Boolean` |
| `Bytes<N>` | Fixed-size byte array | `hash: Bytes<32>` |
| `Uint<N>` | Unsigned integer (N = 8, 16, 32, 64, 128, 256) | `balance: Uint<64>` |
| `Uint<MIN..MAX>` | Bounded unsigned integer | `score: Uint<0..100>` |

**⚠️ Uint Type Equivalence:** `Uint<N>` and `Uint<0..MAX>` are the **SAME type family**.
- `Uint<8>` = `Uint<0..255>`
- `Uint<16>` = `Uint<0..65535>`
- `Uint<64>` = `Uint<0..18446744073709551615>`

### Collection Types

| Type | Description | Example |
|------|-------------|---------|
| `Counter` | Incrementable/decrementable | `count: Counter` |
| `Map<K, V>` | Key-value mapping | `Map<Bytes<32>, Uint<64>>` |
| `Set<T>` | Unique value collection | `Set<Bytes<32>>` |
| `Vector<N, T>` | Fixed-size array | `Vector<3, Field>` |
| `List<T>` | Dynamic list | `List<Bytes<32>>` |
| `Maybe<T>` | Optional value | `Maybe<Bytes<32>>` |
| `Either<L, R>` | Union type | `Either<Field, Bytes<32>>` |
| `Opaque<"type">` | External type from TypeScript | `Opaque<"string">` |

### Custom Types

**Enums** - must use `export` to access from TypeScript:
```compact
export enum GameState { waiting, playing, finished }
export enum Choice { rock, paper, scissors }
```

**Enum Access** - use DOT notation (not Rust-style ::):
```compact
// ✅ CORRECT - dot notation
if (choice == Choice.rock) { ... }
game_state = GameState.waiting;

// ❌ WRONG - Rust-style double colon
if (choice == Choice::rock) { ... }  // Parse error!
```

**Structs**:
```compact
export struct PlayerConfig {
  name: Opaque<"string">,
  score: Uint<32>,
  isActive: Boolean,
}
```

---

## 5. Circuits

Circuits are on-chain functions that generate ZK proofs.

**CRITICAL**: Return type is `[]` (empty tuple), NOT `Void`:

```compact
// ✅ CORRECT - returns []
export circuit increment(): [] {
  counter.increment(1);
}

// ✅ CORRECT - with parameters
export circuit transfer(to: Bytes<32>, amount: Uint<64>): [] {
  assert(amount > 0, "Amount must be positive");
  // ... logic
}

// ✅ CORRECT - with return value
export circuit getBalance(addr: Bytes<32>): Uint<64> {
  return balances.lookup(addr);
}

// ❌ WRONG - Void does not exist
export circuit broken(): Void {  // Parse error!
  counter.increment(1);
}
```

### Circuit Modifiers

```compact
export circuit publicFn(): []      // Callable externally
circuit internalFn(): []           // Internal only, not exported
export pure circuit hash(x: Field): Bytes<32>  // No state access
```

---

## 6. Witnesses

Witnesses provide off-chain/private data to circuits. They run locally, not on-chain.

**CRITICAL**: Witnesses are declarations only - NO implementation body in Compact!
The implementation goes in your TypeScript prover.

```compact
// ✅ CORRECT - declaration only, semicolon at end
witness local_secret_key(): Bytes<32>;
witness get_merkle_path(leaf: Bytes<32>): MerkleTreePath<10, Bytes<32>>;
witness store_locally(data: Field): [];
witness find_user(id: Bytes<32>): Maybe<UserData>;

// ❌ WRONG - witnesses cannot have bodies
witness get_caller(): Bytes<32> {
  return public_key(local_secret_key());  // ERROR!
}
```

---

## 7. Constructor

Optional - initializes sealed ledger fields at deploy time:

```compact
export sealed ledger owner: Bytes<32>;
export sealed ledger nonce: Bytes<32>;

constructor(initNonce: Bytes<32>) {
  owner = disclose(public_key(local_secret_key()));
  nonce = disclose(initNonce);
}
```

---

## 8. Pure Circuits (Helper Functions)

Use `pure circuit` for helper functions that don't modify ledger state:

```compact
// ✅ CORRECT - use "pure circuit"
pure circuit determine_winner(p1: Choice, p2: Choice): Result {
  if (p1 == p2) {
    return Result.draw;
  }
  // ... logic
}

// ❌ WRONG - "function" keyword doesn't exist
pure function determine_winner(p1: Choice, p2: Choice): Result {
  // ERROR: unbound identifier "function"
}
```

---

## 9. Common Operations

### Counter Operations
```compact
counter.increment(1);           // Increase by amount (Uint<16>)
counter.decrement(1);           // Decrease by amount (Uint<16>)
const val = counter.read();     // Get current value (returns Uint<64>)
const low = counter.lessThan(100); // Compare with threshold (Boolean)
counter.resetToDefault();       // Reset to zero

// ⚠️ WRONG: counter.value() does NOT exist - use counter.read()
```

### Map Operations
```compact
// Insert/update operations
balances.insert(address, 100);           // insert(key, value): []
balances.insertDefault(address);         // insertDefault(key): []

// Query operations (all work in circuits ✅)
const balance = balances.lookup(address);  // lookup(key): value_type
const exists = balances.member(address);   // member(key): Boolean
const empty = balances.isEmpty();          // isEmpty(): Boolean
const count = balances.size();             // size(): Uint<64>

// Remove operations
balances.remove(address);                // remove(key): []
balances.resetToDefault();               // resetToDefault(): []
```

### Set Operations
```compact
// Insert/remove operations
members.insert(address);                    // insert(elem): []
members.remove(address);                    // remove(elem): []
members.resetToDefault();                   // resetToDefault(): []

// Query operations (all work in circuits ✅)
const isMember = members.member(address);   // member(elem): Boolean
const empty = members.isEmpty();            // isEmpty(): Boolean
const count = members.size();               // size(): Uint<64>
```

### Maybe Operations
```compact
const opt: Maybe<Field> = some<Field>(42);
const empty: Maybe<Field> = none<Field>();

if (opt.is_some) {
  const val = opt.value;
}
```

### Type Casting
```compact
const bytes: Bytes<32> = myField as Bytes<32>;  // Field to Bytes
const num: Uint<64> = myField as Uint<64>;      // Field to Uint (bounds not checked!)
const field: Field = myUint as Field;           // Uint to Field (safe)
```

### Hashing
```compact
// Persistent hash (same input = same output across calls)
const hash = persistentHash<Vector<2, Bytes<32>>>([data1, data2]);

// Persistent commit (hiding commitment)
const commit = persistentCommit<Field>(value);
```

---

## 10. Assertions

```compact
assert(condition, "Error message");
assert(amount > 0, "Amount must be positive");
assert(disclose(caller == owner), "Not authorized");
```

---

## 11. Common Patterns

### Authentication Pattern
```compact
witness local_secret_key(): Bytes<32>;

// IMPORTANT: public_key() is NOT a builtin - use this pattern
circuit get_public_key(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([pad(32, "myapp:pk:"), sk]);
}

export circuit authenticated_action(): [] {
  const sk = local_secret_key();
  const caller = get_public_key(sk);
  assert(disclose(caller == owner), "Not authorized");
  // ... action
}
```

### Commit-Reveal Pattern
```compact
pragma language_version >= 0.19;

import CompactStandardLibrary;

export ledger commitment: Bytes<32>;
export ledger revealed_value: Field;
export ledger is_revealed: Boolean;

witness local_secret_key(): Bytes<32>;
witness store_secret_value(v: Field): [];
witness get_secret_value(): Field;

// Helper: compute commitment hash
circuit compute_commitment(value: Field, salt: Bytes<32>): Bytes<32> {
  const value_bytes = value as Bytes<32>;
  return persistentHash<Vector<2, Bytes<32>>>([value_bytes, salt]);
}

// Commit phase
export circuit commit(value: Field): [] {
  const salt = local_secret_key();
  store_secret_value(value);
  commitment = disclose(compute_commitment(value, salt));
  is_revealed = false;
}

// Reveal phase
export circuit reveal(): Field {
  const salt = local_secret_key();
  const value = get_secret_value();
  const expected = compute_commitment(value, salt);
  assert(disclose(expected == commitment), "Value doesn't match commitment");
  assert(disclose(!is_revealed), "Already revealed");

  revealed_value = disclose(value);
  is_revealed = true;
  return disclose(value);
}
```

### Two-Player Commit-Reveal (verified: Rock-Paper-Scissors)

The single-value commit-reveal above generalizes cleanly to a **two-party** game where each
player has their own secret move and their own witness-derived key, but shares one ledger.
This exact contract compiled, passed Midnight team review, and is deployed on Preprod/Preview
(`midnight-rps-sample-app`, `pkgs/contract/src/rps.compact`) — worth using as the template
whenever a request needs "two players, hidden moves, no third party/oracle, no server":

```compact
pragma language_version >= 0.16 && <= 0.22;

import CompactStandardLibrary;

export enum GameState  { waiting, committed, finished }
export enum Move       { rock, paper, scissors }
export enum GameResult { not_determined, player1_wins, player2_wins, draw }

export ledger state:       GameState;
export ledger game_over:   Boolean;
export ledger p1_key:      Bytes<32>;   // derived public key, NOT the wallet address
export ledger p2_key:      Bytes<32>;
export ledger p1_joined:   Boolean;
export ledger p2_joined:   Boolean;
export ledger p1_commit:   Bytes<32>;   // hash(move, salt) — the move itself stays hidden
export ledger p2_commit:   Bytes<32>;
export ledger p1_revealed: Boolean;
export ledger p2_revealed: Boolean;
export ledger p1_move:     Move;        // only populated after reveal
export ledger p2_move:     Move;
export ledger result:      GameResult;

// Each caller supplies their OWN secret key + move + salt via witnesses — the contract
// never asks "which player are you", it derives that from who owns which key.
witness local_secret_key():                        Bytes<32>;
witness get_my_move():                             Move;
witness get_my_salt():                              Bytes<32>;
witness store_move_and_salt(m: Move, s: Bytes<32>): [];

// Derive a stable per-player public key from a secret witness, domain-separated so it
// can't collide with a hash used elsewhere in the same contract.
export pure circuit derive_pk(sk: Bytes<32>): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([pad(32, "rps:pk:v1"), sk]);
}

pure circuit make_commit(m: Move, salt: Bytes<32>): Bytes<32> {
  const move_bytes = (m as Field) as Bytes<32>;
  const move_hash  = persistentHash<Vector<1, Bytes<32>>>([move_bytes]);
  return persistentHash<Vector<2, Bytes<32>>>([move_hash, salt]);
}

pure circuit who_wins(m1: Move, m2: Move): GameResult {
  if (m1 == m2) { return GameResult.draw; }
  if (m1 == Move.rock     && m2 == Move.scissors) { return GameResult.player1_wins; }
  if (m1 == Move.scissors && m2 == Move.paper)    { return GameResult.player1_wins; }
  if (m1 == Move.paper    && m2 == Move.rock)     { return GameResult.player1_wins; }
  return GameResult.player2_wins;
}

// First caller becomes P1, second becomes P2 — no player-index argument needed.
// Both players call the SAME circuit; only their private witnesses differ.
export circuit commit(): [] {
  assert(!game_over,                "Game is already over");
  assert(state == GameState.waiting, "Not in waiting state");

  const sk         = local_secret_key();
  const pk         = derive_pk(sk);
  const my_move    = get_my_move();
  const my_salt    = get_my_salt();
  const commitment = make_commit(my_move, my_salt);
  store_move_and_salt(my_move, my_salt); // persist locally for the later reveal() call

  if (!p1_joined) {
    p1_key    = disclose(pk);
    p1_commit = disclose(commitment);
    p1_joined = true;
  } else {
    assert(!p2_joined, "Both players already committed");
    p2_key    = disclose(pk);
    p2_commit = disclose(commitment);
    p2_joined = true;
    state     = GameState.committed;
  }
}

// Caller identity is re-derived from the same secret key, then matched against
// p1_key/p2_key to figure out which slot to reveal into.
export circuit reveal(): [] {
  assert(!game_over,                   "Game is already over");
  assert(state == GameState.committed, "Not in committed state");

  const sk       = local_secret_key();
  const pk       = derive_pk(sk);
  const my_move  = get_my_move();
  const my_salt  = get_my_salt();
  const computed = make_commit(my_move, my_salt);

  const is_p1 = disclose(p1_key == pk);
  const is_p2 = disclose(p2_key == pk);
  assert(is_p1 || is_p2, "Caller is not a registered player");

  if (is_p1) {
    assert(!p1_revealed, "Player 1 already revealed");
    assert(disclose(computed == p1_commit), "Commitment mismatch for P1");
    p1_move     = disclose(my_move);
    p1_revealed = true;
  }
  if (is_p2) {
    assert(!p2_revealed, "Player 2 already revealed");
    assert(disclose(computed == p2_commit), "Commitment mismatch for P2");
    p2_move     = disclose(my_move);
    p2_revealed = true;
  }

  // Only settle once BOTH reveals are in — this is what prevents the second revealer
  // from choosing a move after seeing the first reveal (their commitment already fixed
  // it beforehand; the settlement circuit just can't fire until both are present).
  if (disclose(p1_revealed && p2_revealed)) {
    result    = who_wins(p1_move, p2_move);
    game_over = true;
    state     = GameState.finished;
  }
}
```

Key design points worth reusing in any "two anonymous parties, hidden simultaneous choice" contract:

- **Identity is derived, not passed in.** Neither circuit takes a `playerId` argument — the
  caller's own witness-held secret key deterministically produces the same `derive_pk()`
  output every call, and the contract figures out "who is this" by comparing derived keys
  against what was stored at commit time. This means the contract never needs to trust a
  claimed identity.
- **What gets `disclose()`d is the derived key and the commitment hash — never the raw
  move.** The move only becomes public (`p1_move`/`p2_move`) inside `reveal()`, and only
  after the matching commitment is checked. A contract that discloses the move at commit
  time isn't actually hiding anything and would fail Midnight's privacy requirements.
  See `rules/privacy-selective-disclosure.md`.
- **Settlement is gated on both sides being present**, not on the second `reveal()` call
  specifically — this is what stops player 2 from stalling to see player 1's move before
  deciding whether to reveal at all (they've already committed, so waiting doesn't let them
  change their move, only delays the game).
- **The witness layer (TypeScript) never validates game rules** — `store_move_and_salt`
  just stores whatever it's given. `commit()`/`reveal()`'s `assert()`s are the only source
  of truth on legality; the witness is a dumb local key-value store.

---

### Disclosure in Conditionals
When branching on witness values, wrap comparisons in `disclose()`:

```compact
// ✅ CORRECT
export circuit check(guess: Field): Boolean {
  const secret = get_secret();  // witness
  if (disclose(guess == secret)) {
    return true;
  }
  return false;
}

// ❌ WRONG - will not compile
export circuit check_broken(guess: Field): Boolean {
  const secret = get_secret();
  if (guess == secret) {  // implicit disclosure error
    return true;
  }
  return false;
}
```

---

## 12. Common Mistakes to Avoid

| Mistake | Correct |
|---------|---------|
| `ledger { field: Type; }` | `export ledger field: Type;` |
| `circuit fn(): Void` | `circuit fn(): []` |
| `pragma >= 0.16.0` | `pragma language_version >= 0.19;` |
| `enum State { ... }` | `export enum State { ... }` |
| `if (witness_val == x)` | `if (disclose(witness_val == x))` |
| `Cell<Field>` | `Field` (Cell is deprecated) |
| `counter.value()` | `counter.read()` |
| `pure function helper()` | `pure circuit helper()` |
| `Choice::rock` | `Choice.rock` (use dot, not ::) |

---

## 13. Exports for TypeScript

To use types/values in TypeScript, they must be exported:

```compact
// These are accessible from TypeScript
export enum GameState { waiting, playing }
export struct Config { value: Field }
export ledger counter: Counter;
export circuit play(): []

// Standard library re-exports (if needed in TS)
export { Maybe, Either, CoinInfo };
```

---

## Reference Contracts

These contracts compile successfully and demonstrate correct patterns:

1. **Counter** (beginner): `midnightntwrk/example-counter`
2. **Bulletin Board** (intermediate): `midnightntwrk/example-bboard`
3. **Naval Battle Game** (advanced): `ErickRomeroDev/naval-battle-game_v2`
4. **Sea Battle** (advanced): `bricktowers/midnight-seabattle`
5. **Rock-Paper-Scissors** (two-player commit-reveal, verified in production, Midnight-team-reviewed): `midnight-rps-sample-app` — see the "Two-Player Commit-Reveal" pattern above for the full contract

When in doubt, reference these repos for working syntax.

---

## Rules

See `/rules/` directory for detailed pattern documentation:
- `privacy-selective-disclosure.md` - ZK disclosure patterns
- `tokens-shielded-unshielded.md` - Token vault patterns

## References

- [Midnight Docs](https://docs.midnight.network)
- [Compact Language Guide](https://docs.midnight.network/develop/reference/compact/lang-ref)
- [OpenZeppelin Compact Contracts](https://github.com/OpenZeppelin/compact-contracts)
- [midnight-mcp](https://github.com/Olanetsoft/midnight-mcp)
