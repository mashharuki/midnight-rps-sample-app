import { type WalletContext } from "../api";
import path from "path";
import * as api from "../api";
import type { RpsProviders } from "../common-types";
import { INITIAL_RPS_PRIVATE_STATE } from "contract";
import { Rps } from "contract";
import { currentDir } from "../config";
import { createLogger } from "../logger-utils";
import { TestEnvironment } from "./commons";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const logDir = path.resolve(
  currentDir,
  "..",
  "logs",
  "tests",
  `${new Date().toISOString()}-rps.log`,
);
const logger = await createLogger(logDir);

const { Move, GameResult } = Rps;

describe("RPS API", () => {
  let testEnvironment: TestEnvironment;
  let walletCtx: WalletContext;
  let p1Providers: RpsProviders;
  let p2Providers: RpsProviders;

  beforeAll(
    async () => {
      api.setLogger(logger);
      testEnvironment = new TestEnvironment(logger);
      const testConfiguration = await testEnvironment.start();
      walletCtx = await testEnvironment.getWallet();
      // P1/P2 share the same wallet key but have separate LevelDB private state namespaces
      p1Providers = await api.configureRpsProviders(
        walletCtx,
        testConfiguration.dappConfig,
        "rps-player1",
      );
      p2Providers = await api.configureRpsProviders(
        walletCtx,
        testConfiguration.dappConfig,
        "rps-player2",
      );
    },
    1000 * 60 * 45,
  );

  afterAll(async () => {
    await testEnvironment.shutdown();
  });

  it("P1=rock, P2=paper → player2_wins (Req 3.1) [@slow]", async () => {
    const p1Contract = await api.deployRps(
      p1Providers,
      INITIAL_RPS_PRIVATE_STATE,
    );
    expect(p1Contract).not.toBeNull();
    const contractAddress = p1Contract.deployTxData.public.contractAddress;

    const p2Contract = await api.joinRps(p2Providers, contractAddress);
    expect(p2Contract).not.toBeNull();

    await api.commitRps(p1Providers, p1Contract, Move.rock);
    await api.commitRps(p2Providers, p2Contract, Move.paper);
    await api.revealRps(p1Contract);
    await api.revealRps(p2Contract);

    const state = await api.getRpsState(p1Providers, contractAddress);
    expect(state).not.toBeNull();
    expect(state.result).toEqual(GameResult.player2_wins);
    expect(state.game_over).toBe(true);
  });

  it("P1=rock, P2=rock → draw (Req 3.2) [@slow]", async () => {
    const p1Contract = await api.deployRps(
      p1Providers,
      INITIAL_RPS_PRIVATE_STATE,
    );
    expect(p1Contract).not.toBeNull();
    const contractAddress = p1Contract.deployTxData.public.contractAddress;

    const p2Contract = await api.joinRps(p2Providers, contractAddress);
    expect(p2Contract).not.toBeNull();

    await api.commitRps(p1Providers, p1Contract, Move.rock);
    await api.commitRps(p2Providers, p2Contract, Move.rock);
    await api.revealRps(p1Contract);
    await api.revealRps(p2Contract);

    const state = await api.getRpsState(p1Providers, contractAddress);
    expect(state).not.toBeNull();
    expect(state.result).toEqual(GameResult.draw);
    expect(state.game_over).toBe(true);
  });

  it("P1 commit after both committed → TX rejected (Req 1.4) [@slow]", async () => {
    const p1Contract = await api.deployRps(
      p1Providers,
      INITIAL_RPS_PRIVATE_STATE,
    );
    const contractAddress = p1Contract.deployTxData.public.contractAddress;

    const p2Contract = await api.joinRps(p2Providers, contractAddress);

    await api.commitRps(p1Providers, p1Contract, Move.scissors);
    await api.commitRps(p2Providers, p2Contract, Move.paper);

    // Both players committed; state == committed → assert(state == waiting) fires
    await expect(
      api.commitRps(p1Providers, p1Contract, Move.rock),
    ).rejects.toThrow();
  });
});
