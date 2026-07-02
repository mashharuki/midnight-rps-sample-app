# Agentic SDLC and Spec-Driven Development

Kiro-style Spec-Driven Development on an agentic SDLC

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro-spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro-steering`, `/kiro-steering-custom`
- Discovery: `/kiro-discovery "idea"` — determines action path, writes brief.md + roadmap.md for multi-spec projects
- Phase 1 (Specification):
  - Single spec: `/kiro-spec-quick {feature} [--auto]` or step by step:
    - `/kiro-spec-init "description"`
    - `/kiro-spec-requirements {feature}`
    - `/kiro-validate-gap {feature}` (optional: for existing codebase)
    - `/kiro-spec-design {feature} [-y]`
    - `/kiro-validate-design {feature}` (optional: design review)
    - `/kiro-spec-tasks {feature} [-y]`
  - Multi-spec: `/kiro-spec-batch` — creates all specs from roadmap.md in parallel by dependency wave
- Phase 2 (Implementation): `/kiro-impl {feature} [tasks]`
  - Without task numbers: autonomous mode (subagent per task + independent review + final validation)
  - With task numbers: manual mode (selected tasks in main context, still reviewer-gated before completion)
  - `/kiro-validate-impl {feature}` (standalone re-validation)
- Progress check: `/kiro-spec-status {feature}` (use anytime)

## Skills Structure
Skills are located in `.claude/skills/kiro-*/SKILL.md`
- Each skill is a directory with a `SKILL.md` file
- Skills run inline with access to conversation context
- Skills may delegate parallel research to subagents for efficiency
- Additional files (templates, examples) can be added to skill directories
- `kiro-review` — task-local adversarial review protocol used by reviewer subagents
- `kiro-debug` — root-cause-first debug protocol used by debugger subagents
- `kiro-verify-completion` — fresh-evidence gate before success or completion claims
- **If there is even a 1% chance a skill applies to the current task, invoke it.** Do not skip skills because the task seems simple.

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro-spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro-steering-custom`)
- Note: `.kiro/steering/` has not been initialized yet in this repo — run `/kiro-steering` before relying on it. Until then, this file plus `.kiro/specs/midnight-rps-dapp/` (requirements/design/tasks, approved) are the source of truth.

---

# Project Guide: midnight-rps-sample-app

A Rock-Paper-Scissors dApp on Midnight (privacy-focused blockchain) demonstrating a ZK commit/reveal scheme. Bun workspace monorepo with three packages:

| Package | Role |
|---|---|
| `pkgs/contract` | Compact smart contract (`src/rps.compact`) + witnesses + Vitest simulator tests |
| `pkgs/cli` | Headless Node.js CLI — deploys/joins/plays via a local HD wallet (no browser) |
| `pkgs/app` | React + Vite browser dApp — connects via Lace Wallet extension |

`pkgs/cli` and `pkgs/app` are two independent front-ends over the same contract; they duplicate wallet/provider setup rather than sharing it (no shared `pkgs/sdk`).

## Common Commands

```bash
bun install                                # install all workspaces
bun contract compact                       # compile rps.compact -> pkgs/contract/src/managed/rps (do this first)
bun run build                              # full pipeline: contract build -> sync-keys-rps -> cli build -> app build
bun run test                               # pkgs/contract Vitest suite (bun run --cwd pkgs/contract test to scope one package)
bun run typecheck                          # app build + cli typecheck + contract build (tsc --noEmit, no bundling)
bun run lint / bun run format              # biome check / biome format --write (root); eslint also runs per-package via `<pkg> lint`
bun cli preprod | preprod-ps               # CLI deploy/play on Preprod (-ps = auto-start local proof server)
bun cli preview | preview-ps               # same, on Preview (fewer historical events, faster wallet sync)
bun app dev                                # Vite dev server for the browser app
docker compose -f pkgs/cli/proof-server.yml up   # start proof server manually (needed by both cli and app)
```

Compact toolchain: install via `compact-installer.sh`, then `compact update 0.30.0` — the contract is pinned to compactc 0.30.0 (language 0.22); newer compactc versions fail the pragma check. See root `README.md` for the full setup and Devcontainer instructions.

## Architecture Notes

- **Game logic**: `pkgs/contract/src/rps.compact` implements commit → reveal → settle. `rps-witnesses.ts` supplies the private witnesses (move + salt) consumed by both `pkgs/cli` and `pkgs/app`.
- **ZK artifacts are network-independent**: `pkgs/contract`'s `managed/rps` (zkir + keys) is compiled once and copied into both the CLI build and `pkgs/app/public/managed/rps` (via the root `sync-keys-rps` script). Switching networks never requires recompiling the contract.
- **Network configuration lives in two parallel places** — keep them in sync when adding a network:
  - CLI: `pkgs/cli/src/config.ts` (`PreprodConfig`/`PreviewConfig`, each calls `setNetworkId()` and owns indexer/node/proofServer URLs)
  - App: `pkgs/app/src/utils/networks.ts` (`NETWORKS` map + `NetworkContext`/`useNetwork()`); the user picks a network in `ConnectSection` *before* connecting Lace, since Lace itself decides whether it can honor `connect(networkId)`
- **Proof server is shared infrastructure**, not per-network: `pkgs/cli/proof-server.yml` hard-binds host port 6300. `pkgs/cli/src/preprod-start-proof-server.ts` / `preview-start-proof-server.ts` check `isProofServerRunning()` (`pkgs/cli/src/proof-server-utils.ts`) before spinning up a new Docker container, so re-running `*-ps` while a proof server is already up reuses it instead of failing on a port conflict.
- **CLI wallet caching**: `pkgs/cli/src/api.ts` persists shielded/unshielded/dust wallet snapshots per network under `pkgs/cli/wallet-cache/<network>/<seed-prefix>/`. Do **not** reintroduce a "fast-start"/birthday-offset optimization that rewrites a snapshot's `offset` to skip historical event scanning — it was tried and removed because the zswap commitment tree requires strictly sequential inserts from index 0; patching the offset without the matching tree state corrupts sync (`values inserted non-linearly into zswap commitment tree`). A full genesis sync is the only correct behavior here.
- **App-side network isolation**: `pkgs/app` scopes the cached RPS contract address (`useRpsGame.ts`) and the private-state store name (`providers.ts`) by `networkId`, so switching networks in the UI can't leak a contract address or private move/salt state from the other network.
- Devcontainer memory is limited (~7.7GB total) — `pkgs/cli`'s network-connecting scripts run Node with `--max-old-space-size=4096`; don't raise this without checking available memory first (an 8192 setting previously caused the OOM killer to SIGKILL the process mid-sync).

## Relevant Skills

Invoke proactively when the task matches (see the full skill list in your tool context for others):
- `midnight-deploy` / `midnight-infra-setup` — proof server / Docker infra, preprod/preview/standalone deployment
- `midnight-sdk-guide` — headless CLI wallet/provider patterns (`pkgs/cli`)
- `midnight-lace-dapp` — browser dApp + Lace Wallet integration patterns (`pkgs/app`)
- `midnight-compact-guide` — writing/reviewing `rps.compact`
- `midnight-test-runner` — running/debugging the Vitest contract simulator tests
