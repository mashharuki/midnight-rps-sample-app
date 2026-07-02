// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { stdin as input, stdout as output } from "node:process";
import { createInterface, type Interface } from "node:readline/promises";
import type { Logger } from "pino";
import {
  type DeployedRpsContract,
  RPS_GAME_RESULT_KEYS,
  RPS_GAME_STATE_KEYS,
  RPS_MOVE_KEYS,
  type RpsProviders,
} from "shared";
import type {
  DockerComposeEnvironment,
  StartedDockerComposeEnvironment,
} from "testcontainers";
import type { WalletContext } from "./api";
import * as api from "./api";
import { type Config, StandaloneConfig } from "./config";
import { DIVIDER, GENESIS_MINT_WALLET_SEED } from "./constants";
import { mapContainerPort } from "./docker-utils";

let logger: Logger;

// ─── Display Helpers ────────────────────────────────────────────────────────

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              Midnight RPS Example                            ║
║              ─────────────────────                           ║
║              Rock-Paper-Scissors with ZK commit-reveal       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

// ─── Menu Helpers ──────────────────────────────────────────────────────────

const WALLET_MENU = `
${DIVIDER}
  Wallet Setup
${DIVIDER}
  [1] Create a new wallet
  [2] Restore wallet from seed
  [3] Exit
${"─".repeat(62)}
> `;

// ─── Wallet Setup ───────────────────────────────────────────────────────────

/** Prompt the user for a seed phrase and restore a wallet from it. */
const buildWalletFromSeed = async (
  config: Config,
  rli: Interface,
): Promise<WalletContext> => {
  const seed = await rli.question("Enter your wallet seed: ");
  return await api.buildWalletAndWaitForFunds(config, seed);
};

/**
 * Wallet creation flow.
 * - Standalone configs skip the menu and use the genesis seed automatically.
 * - All other configs present a menu to create or restore a wallet.
 */
const buildWallet = async (
  config: Config,
  rli: Interface,
): Promise<WalletContext | null> => {
  // Standalone mode: use the pre-funded genesis wallet
  if (config instanceof StandaloneConfig) {
    return await api.buildWalletAndWaitForFunds(
      config,
      GENESIS_MINT_WALLET_SEED,
    );
  }

  while (true) {
    const choice = await rli.question(WALLET_MENU);
    switch (choice.trim()) {
      case "1":
        return await api.buildFreshWallet(config);
      case "2":
        return await buildWalletFromSeed(config, rli);
      case "3":
        return null;
      default:
        logger.error(`Invalid choice: ${choice}`);
    }
  }
};

// ─── Contract Interaction ───────────────────────────────────────────────────

/** Format dust balance for menu headers. */
const getDustLabel = async (
  wallet: api.WalletContext["wallet"],
): Promise<string> => {
  try {
    const dust = await api.getDustBalance(wallet);
    return dust.available.toLocaleString();
  } catch {
    return "";
  }
};

/**
 * Start the DUST monitor. Shows a live-updating balance display
 * that runs until the user presses Enter.
 */
const startDustMonitor = async (
  wallet: api.WalletContext["wallet"],
  rli: Interface,
): Promise<void> => {
  console.log("");
  // Use readline question to wait for Enter — the monitor will render above this line
  const stopPromise = rli
    .question("  Press Enter to return to menu...\n")
    .then(() => {});
  await api.monitorDustBalance(wallet, stopPromise);
  console.log("");
};

// ─── RPS Menus ─────────────────────────────────────────────────────────────

const rpsContractMenu = (dustBalance: string) => `
${DIVIDER}
  RPS Contract Setup${dustBalance ? `               DUST: ${dustBalance}` : ""}
${DIVIDER}
  [1] Deploy a new RPS contract
  [2] Join an existing RPS contract
  [3] Monitor DUST balance
  [4] Exit
${"─".repeat(62)}
> `;

const rpsActionsMenu = (address: string, dustBalance: string) => `
${DIVIDER}
  RPS Actions${dustBalance ? `                         DUST: ${dustBalance}` : ""}
  Contract: ${address}
${DIVIDER}
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
${"─".repeat(62)}
> `;

const MOVE_MENU = `
${DIVIDER}
  Select your move
${DIVIDER}
  [1] Rock     🪨
  [2] Paper    🖐
  [3] Scissors ✌️
${"─".repeat(62)}
> `;

const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

/** Ask the user to select rock / paper / scissors. Returns 0 / 1 / 2. */
const selectMove = async (rli: Interface): Promise<number | null> => {
  while (true) {
    const choice = await rli.question(MOVE_MENU);
    switch (choice.trim()) {
      case "1":
        return 0; // rock
      case "2":
        return 1; // paper
      case "3":
        return 2; // scissors
      default:
        console.log("  Invalid choice. Please enter 1, 2, or 3.");
    }
  }
};

/** Deploy or join an RPS contract. Returns the contract handle, or null if the user exits. */
const deployOrJoinRps = async (
  providers: RpsProviders,
  walletCtx: api.WalletContext,
  rli: Interface,
): Promise<DeployedRpsContract | null> => {
  while (true) {
    const dustLabel = await getDustLabel(walletCtx.wallet);
    const choice = await rli.question(rpsContractMenu(dustLabel));
    switch (choice.trim()) {
      case "1":
        try {
          const contract = await api.withStatus("Deploying RPS contract", () =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            api.deployRps(providers, {
              secretKey: (globalThis as any).crypto.getRandomValues(
                new Uint8Array(32),
              ),
              myMove: null,
              mySalt: null,
            }),
          );
          console.log(
            `  Contract deployed at: ${(contract as any).deployTxData.public.contractAddress}\n`,
          );
          return contract;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`\n  ✗ Deploy failed: ${msg}\n`);
        }
        break;
      case "2":
        try {
          const contractAddress = await rli.question(
            "Enter the RPS contract address (hex): ",
          );
          const contract = await api.withStatus("Joining RPS contract", () =>
            api.joinRps(providers, contractAddress.trim()),
          );
          console.log(
            `  Joined contract at: ${(contract as any).deployTxData.public.contractAddress}\n`,
          );
          return contract;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`  ✗ Failed to join contract: ${msg}\n`);
        }
        break;
      case "3":
        await startDustMonitor(walletCtx.wallet, rli);
        break;
      case "4":
        return null;
      default:
        console.log(`  Invalid choice: ${choice}`);
    }
  }
};

/** RPS main interaction loop after a contract is deployed/joined. */
const rpsMainLoop = async (
  providers: RpsProviders,
  walletCtx: api.WalletContext,
  rli: Interface,
): Promise<void> => {
  const rpsContract = await deployOrJoinRps(providers, walletCtx, rli);
  if (rpsContract === null) return;

  const contractAddress: string = (rpsContract as any).deployTxData.public
    .contractAddress;

  while (true) {
    const dustLabel = await getDustLabel(walletCtx.wallet);
    const choice = await rli.question(
      rpsActionsMenu(contractAddress, dustLabel),
    );
    switch (choice.trim()) {
      case "1": {
        const move = await selectMove(rli);
        if (move === null) break;
        const moveLabel = capitalize(RPS_MOVE_KEYS[move]);
        try {
          await api.withStatus(
            `Committing move (${moveLabel}) — generating ZK proof`,
            () => api.commitRps(providers, rpsContract, move),
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`  ✗ Commit failed: ${msg}\n`);
        }
        break;
      }
      case "2":
        try {
          await api.withStatus("Revealing move — generating ZK proof", () =>
            api.revealRps(rpsContract),
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`  ✗ Reveal failed: ${msg}\n`);
        }
        break;
      case "3":
        try {
          const state = await api.getRpsState(providers, contractAddress);
          if (state == null) {
            console.log("  No state found at this contract address.\n");
          } else {
            console.log(`
  Game State:   ${RPS_GAME_STATE_KEYS[state.state] ?? state.state}
  Game Over:    ${state.game_over}
  P1 Joined:   ${state.p1_joined}
  P2 Joined:   ${state.p2_joined}
  P1 Revealed: ${state.p1_revealed}
  P2 Revealed: ${state.p2_revealed}
  Result:       ${RPS_GAME_RESULT_KEYS[state.result] ?? state.result}
`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.log(`  ✗ Failed to get state: ${msg}\n`);
        }
        break;
      case "4":
        return;
      default:
        console.log(`  Invalid choice: ${choice}`);
    }
  }
};

// ─── Entry Point ────────────────────────────────────────────────────────────

/**
 * Main entry point for the CLI.
 *
 * Flow:
 *   1. (Optional) Start Docker containers for proof server / node / indexer
 *   2. Build or restore a wallet and wait for it to be funded
 *   3. Configure midnight-js providers (proof server, indexer, wallet, private state)
 *   4. Enter the RPS contract deploy/join and interaction loop
 *   5. Clean up: close wallet, readline, and docker environment
 */
export const run = async (
  config: Config,
  _logger: Logger,
  dockerEnv?: DockerComposeEnvironment,
): Promise<void> => {
  logger = _logger;
  api.setLogger(_logger);

  // Print the title banner
  console.log(BANNER);

  const rli = createInterface({ input, output, terminal: true });
  let env: StartedDockerComposeEnvironment | undefined;

  try {
    // Step 1: Start Docker environment if provided (e.g. local proof server)
    if (dockerEnv !== undefined) {
      env = await dockerEnv.up();

      // In standalone mode, remap ports to the dynamically assigned container ports
      if (config instanceof StandaloneConfig) {
        config.indexer = mapContainerPort(env, config.indexer, "rps-indexer");
        config.indexerWS = mapContainerPort(
          env,
          config.indexerWS,
          "rps-indexer",
        );
        config.node = mapContainerPort(env, config.node, "rps-node");
        config.proofServer = mapContainerPort(
          env,
          config.proofServer,
          "rps-proof-server",
        );
      }
    }

    // Step 2: Build wallet (create new or restore from seed)
    const walletCtx = await buildWallet(config, rli);
    if (walletCtx === null) {
      return;
    }

    try {
      // Step 3: Configure RPS providers and start game loop
      const providers = await api.withStatus("Configuring RPS providers", () =>
        api.configureRpsProviders(walletCtx, config),
      );
      console.log("");
      await rpsMainLoop(providers, walletCtx, rli);
    } catch (e) {
      if (e instanceof Error) {
        logger.error(`Error: ${e.message}`);
        logger.debug(`${e.stack}`);
      } else {
        throw e;
      }
    } finally {
      // Step 5a: Stop the wallet
      try {
        await walletCtx.wallet.stop();
      } catch (e) {
        logger.error(`Error stopping wallet: ${e}`);
      }
    }
  } finally {
    // Step 5b: Close readline and Docker environment
    rli.close();
    rli.removeAllListeners();

    if (env !== undefined) {
      try {
        await env.down();
      } catch (e) {
        logger.error(`Error shutting down docker environment: ${e}`);
      }
    }

    logger.info("Goodbye.");
  }
};
