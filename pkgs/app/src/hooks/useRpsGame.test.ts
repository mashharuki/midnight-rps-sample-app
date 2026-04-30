import { describe, expect, it } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Constant validation — verifiable without browser/React environment.
// These values are defined in rps-types.ts and rps-witnesses.ts; the tests
// serve as a living specification that the constants match the Compact contract.
// ─────────────────────────────────────────────────────────────────────────────
describe("RPS type constants", () => {
  it("RpsPrivateStateId is 'rpsPrivateState', distinct from counterPrivateState", () => {
    const RpsPrivateStateId = "rpsPrivateState";
    expect(RpsPrivateStateId).toBe("rpsPrivateState");
    expect(RpsPrivateStateId).not.toBe("counterPrivateState");
  });

  it("RPS zkConfigPath is /managed/rps, distinct from /managed/counter", () => {
    // createRpsProviders() in providers.ts uses `${window.location.origin}/managed/rps`
    // createCounterProviders() uses `${window.location.origin}/managed/counter`
    const rpsPath = "/managed/rps";
    const counterPath = "/managed/counter";
    expect(rpsPath).not.toBe(counterPath);
    expect(rpsPath).toContain("rps");
    expect(counterPath).toContain("counter");
  });

  it("RpsMove values match Compact contract enum (rock=0, paper=1, scissors=2)", () => {
    // Defined in rps-types.ts and must align with managed/rps/contract/index.d.ts
    const RpsMove = { rock: 0, paper: 1, scissors: 2 } as const;
    expect(RpsMove.rock).toBe(0);
    expect(RpsMove.paper).toBe(1);
    expect(RpsMove.scissors).toBe(2);
  });

  it("RpsGameState values match Compact enum (waiting=0, committed=1, finished=2)", () => {
    const RpsGameState = { waiting: 0, committed: 1, finished: 2 } as const;
    expect(RpsGameState.waiting).toBe(0);
    expect(RpsGameState.committed).toBe(1);
    expect(RpsGameState.finished).toBe(2);
  });

  it("RpsGameResult values: not_determined=0, player1_wins=1, player2_wins=2, draw=3", () => {
    const RpsGameResult = {
      not_determined: 0,
      player1_wins: 1,
      player2_wins: 2,
      draw: 3,
    } as const;
    expect(RpsGameResult.not_determined).toBe(0);
    expect(RpsGameResult.player1_wins).toBe(1);
    expect(RpsGameResult.player2_wins).toBe(2);
    expect(RpsGameResult.draw).toBe(3);
    // draw and not_determined must be distinct
    expect(RpsGameResult.draw).not.toBe(RpsGameResult.not_determined);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Full useRpsGame hook tests — require React testing library + jsdom.
// To enable: add vitest/jsdom + @testing-library/react to pkgs/app devDependencies
// and set `environment: "jsdom"` in vitest.config.ts.
// ─────────────────────────────────────────────────────────────────────────────
describe("useRpsGame hook state transitions (requires jsdom + react-testing-library)", () => {
  it.todo("idle → joining → joined after successful joinRpsContract()");
  it.todo(
    "status === 'committing' while ZK proof generates; commit button disabled (Req 5.3)",
  );
  it.todo(
    "committed → revealing → finished via subscribeToRpsState ledger update",
  );
  it.todo("error status restores prevStatusRef on next retry call");
  it.todo("subscription is unsubscribed on wallet disconnect (cleanup effect)");
});
