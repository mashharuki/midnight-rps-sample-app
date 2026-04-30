import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, expect, it } from "vitest";
import { GameResult, GameState, Move, RpsSimulator } from "./rps-simulator.js";

setNetworkId("undeployed");

// Deterministic keys for reproducible tests
const P1_KEY = new Uint8Array(32).fill(1);
const P2_KEY = new Uint8Array(32).fill(2);
const SALT_A = new Uint8Array(32).fill(0xaa);
const SALT_B = new Uint8Array(32).fill(0xbb);

/** Run a full commit→reveal game and return the final GameResult. */
function playGame(p1Move: Move, p2Move: Move): GameResult {
  const sim = new RpsSimulator(P1_KEY, P2_KEY);
  sim.p1Commit(p1Move, SALT_A);
  sim.p2Commit(p2Move, SALT_B);
  sim.p1Reveal();
  sim.p2Reveal();
  return sim.getLedger().result;
}

describe("RPS smart contract", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Initial state
  // ─────────────────────────────────────────────────────────────────────────
  describe("initial ledger state", () => {
    it("starts in waiting state with no players joined", () => {
      const sim = new RpsSimulator(P1_KEY, P2_KEY);
      const l = sim.getLedger();
      expect(l.state).toBe(GameState.waiting);
      expect(l.game_over).toBe(false);
      expect(l.p1_joined).toBe(false);
      expect(l.p2_joined).toBe(false);
      expect(l.p1_revealed).toBe(false);
      expect(l.p2_revealed).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // who_wins() — 9 move combinations (Req 3.1, 3.2)
  // ─────────────────────────────────────────────────────────────────────────
  describe("who_wins() — all 9 move combinations", () => {
    it("rock vs rock → draw", () => {
      expect(playGame(Move.rock, Move.rock)).toBe(GameResult.draw);
    });
    it("rock vs paper → player2_wins", () => {
      expect(playGame(Move.rock, Move.paper)).toBe(GameResult.player2_wins);
    });
    it("rock vs scissors → player1_wins", () => {
      expect(playGame(Move.rock, Move.scissors)).toBe(GameResult.player1_wins);
    });
    it("paper vs rock → player1_wins", () => {
      expect(playGame(Move.paper, Move.rock)).toBe(GameResult.player1_wins);
    });
    it("paper vs paper → draw", () => {
      expect(playGame(Move.paper, Move.paper)).toBe(GameResult.draw);
    });
    it("paper vs scissors → player2_wins", () => {
      expect(playGame(Move.paper, Move.scissors)).toBe(GameResult.player2_wins);
    });
    it("scissors vs rock → player2_wins", () => {
      expect(playGame(Move.scissors, Move.rock)).toBe(GameResult.player2_wins);
    });
    it("scissors vs paper → player1_wins", () => {
      expect(playGame(Move.scissors, Move.paper)).toBe(GameResult.player1_wins);
    });
    it("scissors vs scissors → draw", () => {
      expect(playGame(Move.scissors, Move.scissors)).toBe(GameResult.draw);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // make_commit() — hiding & binding properties
  // ─────────────────────────────────────────────────────────────────────────
  describe("make_commit() — commitment binding and hiding", () => {
    it("binding: same move + same salt → identical commitment hash", () => {
      const sim1 = new RpsSimulator(P1_KEY, P2_KEY);
      sim1.p1Commit(Move.rock, SALT_A);
      const hash1 = Buffer.from(sim1.getLedger().p1_commit).toString("hex");

      const sim2 = new RpsSimulator(P1_KEY, P2_KEY);
      sim2.p1Commit(Move.rock, SALT_A);
      const hash2 = Buffer.from(sim2.getLedger().p1_commit).toString("hex");

      expect(hash1).toBe(hash2);
    });

    it("hiding: same move + different salt → different commitment hash", () => {
      const sim1 = new RpsSimulator(P1_KEY, P2_KEY);
      sim1.p1Commit(Move.rock, SALT_A);
      const hash1 = Buffer.from(sim1.getLedger().p1_commit).toString("hex");

      const sim2 = new RpsSimulator(P1_KEY, P2_KEY);
      sim2.p1Commit(Move.rock, SALT_B);
      const hash2 = Buffer.from(sim2.getLedger().p1_commit).toString("hex");

      expect(hash1).not.toBe(hash2);
    });

    it("hiding: different moves + same salt → different commitment hash", () => {
      const sim1 = new RpsSimulator(P1_KEY, P2_KEY);
      sim1.p1Commit(Move.rock, SALT_A);
      const hash1 = Buffer.from(sim1.getLedger().p1_commit).toString("hex");

      const sim2 = new RpsSimulator(P1_KEY, P2_KEY);
      sim2.p1Commit(Move.paper, SALT_A);
      const hash2 = Buffer.from(sim2.getLedger().p1_commit).toString("hex");

      expect(hash1).not.toBe(hash2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Double-commit rejection (Req 1.4)
  //
  // The contract allows the FIRST and SECOND commits from any caller (filling
  // P1 and P2 slots in order). Once both slots are filled (state=committed),
  // assert(state == GameState.waiting) fires for any further commit attempt.
  // ─────────────────────────────────────────────────────────────────────────
  describe("double-commit rejection (Req 1.4)", () => {
    it("no commit is accepted after both players are committed (P1 tries)", () => {
      const sim = new RpsSimulator(P1_KEY, P2_KEY);
      sim.p1Commit(Move.rock, SALT_A);
      sim.p2Commit(Move.paper, SALT_B);
      // state=committed → assert(state == GameState.waiting) fires
      expect(() => sim.p1Commit(Move.scissors, SALT_A)).toThrow();
    });

    it("no commit is accepted after both players are committed (P2 tries)", () => {
      const sim = new RpsSimulator(P1_KEY, P2_KEY);
      sim.p1Commit(Move.rock, SALT_A);
      sim.p2Commit(Move.paper, SALT_B);
      // Both committed → any further commit → assert(state==waiting) fires
      expect(() => sim.p2Commit(Move.scissors, SALT_B)).toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Double-reveal rejection (Req 2.5)
  // ─────────────────────────────────────────────────────────────────────────
  describe("double-reveal rejection (Req 2.5)", () => {
    it("P1 cannot reveal a second time", () => {
      const sim = new RpsSimulator(P1_KEY, P2_KEY);
      sim.p1Commit(Move.rock, SALT_A);
      sim.p2Commit(Move.paper, SALT_B);
      sim.p1Reveal();
      // P1 tries to reveal again → assert(!p1_revealed) fires
      expect(() => sim.p1Reveal()).toThrow();
    });

    it("P2 cannot reveal after game is over", () => {
      const sim = new RpsSimulator(P1_KEY, P2_KEY);
      sim.p1Commit(Move.rock, SALT_A);
      sim.p2Commit(Move.paper, SALT_B);
      sim.p1Reveal();
      sim.p2Reveal(); // game finishes here
      // Game over → assert(!game_over) fires
      expect(() => sim.p2Reveal()).toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Full game state progression
  // ─────────────────────────────────────────────────────────────────────────
  describe("full game state progression", () => {
    it("state transitions: waiting → committed → finished", () => {
      const sim = new RpsSimulator(P1_KEY, P2_KEY);

      // After P1 commits: still waiting (p2 not yet joined)
      sim.p1Commit(Move.rock, SALT_A);
      expect(sim.getLedger().state).toBe(GameState.waiting);
      expect(sim.getLedger().p1_joined).toBe(true);
      expect(sim.getLedger().p2_joined).toBe(false);

      // After P2 commits: state becomes committed
      sim.p2Commit(Move.paper, SALT_B);
      expect(sim.getLedger().state).toBe(GameState.committed);
      expect(sim.getLedger().p2_joined).toBe(true);

      // After P1 reveals
      sim.p1Reveal();
      expect(sim.getLedger().p1_revealed).toBe(true);
      expect(sim.getLedger().state).toBe(GameState.committed); // not finished yet

      // After P2 reveals: state becomes finished
      sim.p2Reveal();
      expect(sim.getLedger().state).toBe(GameState.finished);
      expect(sim.getLedger().game_over).toBe(true);
      expect(sim.getLedger().result).toBe(GameResult.player2_wins);
    });
  });
});
