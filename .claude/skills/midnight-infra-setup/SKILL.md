---
name: midnight-infra-setup
description: >
  Set up and run Midnight infrastructure locally using Docker Compose.
  Use this skill when starting a proof server, local node, or indexer via Docker.
  Triggers on: "setup infrastructure", "start local node", "run indexer", "proof server",
  "docker compose", "standalone", "local development", "midnight-node", "proof-server.yml",
  "standalone.yml", "midnightntwrk/proof-server".
  Always use when the user needs to start any Midnight Docker service.
license: MIT
metadata:
  author: mashharuki
  version: "2.0.0"
  proof-server-image: "midnightntwrk/proof-server:8.0.3"
  node-image: "midnightntwrk/midnight-node:0.22.3"
  indexer-image: "midnightntwrk/indexer-standalone:4.0.0"
  reference: "midnightntwrk/example-counter"
---

# Midnight Infrastructure Setup (Docker Compose)

> **All infrastructure runs via Docker Compose** — no Rust/Cargo compilation required.

---

## Two Modes

| Mode | Docker Compose file | What it starts | Use when |
|------|-------------------|---------------|----------|
| **Proof Server only** | `proof-server.yml` | Proof server on port 6300 | Connecting to Preprod/Preview testnet |
| **Standalone** | `standalone.yml` | Proof server + Indexer + Node | Fully local development |

---

## Mode A: Proof Server Only (Preprod / Preview)

Use this when you want to connect to a public testnet but need a local proof server.

```bash
cd counter-cli
docker compose -f proof-server.yml up
```

`proof-server.yml`:
```yaml
services:
  proof-server:
    image: 'midnightntwrk/proof-server:8.0.3'
    command: ['midnight-proof-server -v']
    ports:
      - '6300:6300'
    environment:
      RUST_BACKTRACE: 'full'
```

**Verify it's running:**
```bash
curl http://localhost:6300/version
# Returns the proof server version
```

---

## Mode B: Standalone (Full Local Stack)

Starts all three services needed for local development. The CLI handles this automatically:

```bash
cd counter-cli
npm run standalone
```

Or start manually:
```bash
cd counter-cli
docker compose -f standalone.yml up
```

`standalone.yml` (abridged):
```yaml
services:
  proof-server:
    image: 'midnightntwrk/proof-server:8.0.3'
    ports: ['6300']

  indexer:
    image: 'midnightntwrk/indexer-standalone:4.0.0'
    ports: ['0:8088']
    environment:
      APP__APPLICATION__NETWORK_ID: 'undeployed'
    depends_on:
      node:
        condition: service_healthy

  node:
    image: 'midnightntwrk/midnight-node:0.22.3'
    ports: ['9944']
    environment:
      CFG_PRESET: 'dev'
```

---

## Service Endpoints

| Service | Standalone Endpoint | Notes |
|---------|--------------------|----|
| Proof Server | `http://127.0.0.1:6300` | Same for both modes |
| Indexer | `http://127.0.0.1:8088/api/v3/graphql` | Standalone only |
| Node | `http://127.0.0.1:9944` | Standalone only |

NetworkId for standalone: `'undeployed'`

---

## Health Checks

```bash
# Proof server
curl http://localhost:6300/version

# Indexer GraphQL (standalone)
curl http://127.0.0.1:8088/api/v3/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Node (standalone)
curl http://127.0.0.1:9944/health
```

---

## Startup Sequence (Standalone)

The services must start in order. Docker Compose handles this with `depends_on` + health checks:

```
1. midnight-node:0.22.3  starts first
   └─ healthcheck: GET /health every 2s, up to 20 retries
2. indexer-standalone:4.0.0  starts after node is healthy
   └─ healthcheck: cat /var/run/indexer-standalone/running
3. proof-server:8.0.3  starts independently
   └─ healthcheck: GET /version every 10s
```

Allow ~30-60 seconds for all services to initialize on first run.

---

## Using `preprod-ps` / `preview-ps` Scripts

The npm scripts handle Docker + CLI together:

```bash
# Pull latest images and start proof server + CLI
npm run preprod-ps   # Preprod + auto-start proof server
npm run preview-ps   # Preview + auto-start proof server
```

These scripts:
1. `docker compose -f proof-server.yml pull` (update images)
2. Start CLI with ts-node

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `Cannot connect to Docker daemon` | Start Docker Desktop |
| Proof server hangs on Mac ARM (Apple Silicon) | Docker Desktop → Settings → General → Virtual Machine Options → **Docker VMM** → Restart Docker |
| Port already in use | `lsof -i :6300` then `kill -9 <PID>` |
| Indexer not ready | Wait longer; check `docker compose logs indexer` |
| `Could not find a working container runtime strategy` | Docker is not running |
| Images take a long time | First `docker compose pull` downloads ~1GB of images |

---

## Stop Services

```bash
# Stop all (keep containers)
docker compose -f proof-server.yml stop

# Stop and remove containers
docker compose -f proof-server.yml down

# Stop standalone
docker compose -f standalone.yml down
```

---

## Docker Image Versions (current)

| Service | Image | Version |
|---------|-------|---------|
| Proof Server | `midnightntwrk/proof-server` | `8.0.3` |
| Indexer | `midnightntwrk/indexer-standalone` | `4.0.0` |
| Node | `midnightntwrk/midnight-node` | `0.22.3` |

> These versions are locked in `counter-cli/standalone.yml` and `counter-cli/proof-server.yml`.
> Use the exact versions specified there to ensure compatibility.

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [example-counter standalone.yml](https://github.com/midnightntwrk/example-counter/blob/main/counter-cli/standalone.yml)
- [Midnight Docs](https://docs.midnight.network/)
