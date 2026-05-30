FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ARG TARGETARCH
ARG NODE_VERSION=23.3.0
ARG BUN_VERSION=1.3.13
ARG DOCKER_CLI_VERSION=27.4.0
ARG DOCKER_COMPOSE_VERSION=2.29.7
ARG COMPACT_WRAPPER_VERSION=0.2.0
ARG COMPACTC_VERSION=0.30.0

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        acl \
        ca-certificates \
        curl \
        git \
        gnupg \
        unzip \
        xz-utils \
    && rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    case "${TARGETARCH}" in \
        "amd64") \
            NODE_ARCH="x64"; \
            BUN_ARCH="x64"; \
            DOCKER_ARCH="x86_64"; \
            ;; \
        "arm64") \
            NODE_ARCH="arm64"; \
            BUN_ARCH="aarch64"; \
            DOCKER_ARCH="aarch64"; \
            ;; \
        *) \
            echo "Unsupported TARGETARCH: ${TARGETARCH}"; \
            exit 1; \
            ;; \
    esac; \
    curl -fsSLo /tmp/node.tar.xz "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"; \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1; \
    rm -f /tmp/node.tar.xz; \
    node --version | grep -F "v${NODE_VERSION}"; \
    npm --version

RUN set -eux; \
    case "${TARGETARCH}" in \
        "amd64") BUN_ARCH="x64" ;; \
        "arm64") BUN_ARCH="aarch64" ;; \
        *) \
            echo "Unsupported TARGETARCH: ${TARGETARCH}"; \
            exit 1; \
            ;; \
    esac; \
    curl -fsSLo /tmp/bun.zip "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${BUN_ARCH}.zip"; \
    unzip -q /tmp/bun.zip -d /tmp; \
    install -m 0755 "/tmp/bun-linux-${BUN_ARCH}/bun" /usr/local/bin/bun; \
    rm -rf /tmp/bun.zip "/tmp/bun-linux-${BUN_ARCH}"; \
    bun --version | grep -F "${BUN_VERSION}"

RUN set -eux; \
    case "${TARGETARCH}" in \
        "amd64") DOCKER_ARCH="x86_64" ;; \
        "arm64") DOCKER_ARCH="aarch64" ;; \
        *) \
            echo "Unsupported TARGETARCH: ${TARGETARCH}"; \
            exit 1; \
            ;; \
    esac; \
    curl -fsSLo /tmp/docker.tgz "https://download.docker.com/linux/static/stable/${DOCKER_ARCH}/docker-${DOCKER_CLI_VERSION}.tgz"; \
    tar -xzf /tmp/docker.tgz -C /tmp; \
    install -m 0755 /tmp/docker/docker /usr/local/bin/docker; \
    rm -rf /tmp/docker /tmp/docker.tgz; \
    docker --version | grep -F "${DOCKER_CLI_VERSION}"

RUN set -eux; \
    case "${TARGETARCH}" in \
        "amd64") COMPOSE_ARCH="x86_64" ;; \
        "arm64") COMPOSE_ARCH="aarch64" ;; \
        *) \
            echo "Unsupported TARGETARCH: ${TARGETARCH}"; \
            exit 1; \
            ;; \
    esac; \
    install -d /usr/local/lib/docker/cli-plugins; \
    curl -fsSLo /usr/local/lib/docker/cli-plugins/docker-compose "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-${COMPOSE_ARCH}"; \
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose; \
    docker compose version | grep -F "v${DOCKER_COMPOSE_VERSION}"

# Install compact wrapper (latest release asset — version-tagged installer assets are not published)
# compactc pinning is done at container start via postCreateCommand so it lands in the user's home
RUN set -eux; \
    curl --proto '=https' --tlsv1.2 -LsSf \
        https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh \
        -o /tmp/compact-installer.sh; \
    sh /tmp/compact-installer.sh; \
    rm -f /tmp/compact-installer.sh; \
    COMPACT_BIN=""; \
    if   [ -x /root/.local/bin/compact ];  then COMPACT_BIN=/root/.local/bin/compact; \
    elif [ -x /root/.cargo/bin/compact ];  then COMPACT_BIN=/root/.cargo/bin/compact; \
    fi; \
    if [ -n "${COMPACT_BIN}" ]; then \
        install -m 0755 "${COMPACT_BIN}" /usr/local/bin/compact; \
    else \
        echo "ERROR: compact binary not found after install" && exit 1; \
    fi; \
    compact --version

ENV PATH="/usr/local/bin:${PATH}"
