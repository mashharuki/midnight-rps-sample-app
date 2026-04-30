import {
  type CircuitContext,
  type ChargedState,
  type EncodedZswapLocalState,
  sampleContractAddress,
  createConstructorContext,
  createCircuitContext,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
  type Witnesses,
  Move,
  GameResult,
  GameState,
} from "../managed/rps/contract/index.js";
import { type RpsPrivateState, rpsWitnesses } from "../rps-witnesses.js";

export { Move, GameResult, GameState };

/**
 * Two-player RPS contract simulator for unit testing.
 * Executes impureCircuits directly (no ZK proof generation).
 *
 * Usage:
 *   const sim = new RpsSimulator();
 *   sim.p1Commit(Move.rock);
 *   sim.p2Commit(Move.paper);
 *   sim.p1Reveal();
 *   sim.p2Reveal();
 *   sim.getLedger().result; // GameResult.player2_wins
 */
export class RpsSimulator {
  private readonly contract: Contract<RpsPrivateState>;
  private p1PrivateState: RpsPrivateState;
  private p2PrivateState: RpsPrivateState;
  private p1ZswapState: EncodedZswapLocalState;
  private p2ZswapState: EncodedZswapLocalState;
  private sharedState: ChargedState;
  private readonly contractAddress = sampleContractAddress();

  constructor(
    p1SecretKey: Uint8Array = new Uint8Array(32).fill(1),
    p2SecretKey: Uint8Array = new Uint8Array(32).fill(2),
  ) {
    // Single contract instance — both players share witnesses (which read from privateState)
    // biome-ignore lint/suspicious/noExplicitAny: witness type compat (number vs Move enum)
    this.contract = new Contract<RpsPrivateState>(
      rpsWitnesses as unknown as Witnesses<RpsPrivateState>,
    );

    this.p1PrivateState = {
      secretKey: p1SecretKey,
      myMove: null,
      mySalt: null,
    };
    this.p2PrivateState = {
      secretKey: p2SecretKey,
      myMove: null,
      mySalt: null,
    };

    // Initialize shared ledger state from p1 (both give the same initial ledger)
    const p1Init = this.contract.initialState(
      createConstructorContext(this.p1PrivateState, "0".repeat(64)),
    );
    const p2Init = this.contract.initialState(
      createConstructorContext(this.p2PrivateState, "0".repeat(64)),
    );

    this.p1ZswapState = p1Init.currentZswapLocalState;
    this.p2ZswapState = p2Init.currentZswapLocalState;
    // Both start from the same (empty) contract state — use P1's
    this.sharedState = p1Init.currentContractState.data;
  }

  getLedger(): Ledger {
    return ledger(this.sharedState);
  }

  private p1Ctx(ps: RpsPrivateState): CircuitContext<RpsPrivateState> {
    return createCircuitContext(
      this.contractAddress,
      this.p1ZswapState,
      this.sharedState,
      ps,
    );
  }

  private p2Ctx(ps: RpsPrivateState): CircuitContext<RpsPrivateState> {
    return createCircuitContext(
      this.contractAddress,
      this.p2ZswapState,
      this.sharedState,
      ps,
    );
  }

  p1Commit(
    move: Move,
    salt: Uint8Array = new Uint8Array(32).fill(0xaa),
  ): Ledger {
    // biome-ignore lint/suspicious/noExplicitAny: Move enum is number at runtime
    const ps: RpsPrivateState = {
      ...this.p1PrivateState,
      myMove: move as unknown as number,
      mySalt: salt,
    };
    const result = this.contract.impureCircuits.commit(this.p1Ctx(ps));
    this.p1PrivateState = result.context.currentPrivateState;
    this.p1ZswapState = result.context.currentZswapLocalState;
    this.sharedState = result.context.currentQueryContext.state;
    return ledger(this.sharedState);
  }

  p2Commit(
    move: Move,
    salt: Uint8Array = new Uint8Array(32).fill(0xbb),
  ): Ledger {
    // biome-ignore lint/suspicious/noExplicitAny: Move enum is number at runtime
    const ps: RpsPrivateState = {
      ...this.p2PrivateState,
      myMove: move as unknown as number,
      mySalt: salt,
    };
    const result = this.contract.impureCircuits.commit(this.p2Ctx(ps));
    this.p2PrivateState = result.context.currentPrivateState;
    this.p2ZswapState = result.context.currentZswapLocalState;
    this.sharedState = result.context.currentQueryContext.state;
    return ledger(this.sharedState);
  }

  p1Reveal(): Ledger {
    const result = this.contract.impureCircuits.reveal(
      this.p1Ctx(this.p1PrivateState),
    );
    this.p1PrivateState = result.context.currentPrivateState;
    this.p1ZswapState = result.context.currentZswapLocalState;
    this.sharedState = result.context.currentQueryContext.state;
    return ledger(this.sharedState);
  }

  p2Reveal(): Ledger {
    const result = this.contract.impureCircuits.reveal(
      this.p2Ctx(this.p2PrivateState),
    );
    this.p2PrivateState = result.context.currentPrivateState;
    this.p2ZswapState = result.context.currentZswapLocalState;
    this.sharedState = result.context.currentQueryContext.state;
    return ledger(this.sharedState);
  }
}
