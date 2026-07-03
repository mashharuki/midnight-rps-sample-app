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

import net from "node:net";

/**
 * proof-server.yml binds a fixed host port (6300), and each *-ps script spins up
 * a brand new docker-compose project via testcontainers. If a proof server is
 * already listening on that port, the new container fails to bind it. Checking
 * first lets callers reuse an already-running proof server instead of racing it.
 */
/**
 * VS Code Dev Containers sets REMOTE_CONTAINERS=true. In that setup this CLI's own
 * process runs inside a container that is a *sibling* of the proof server (the
 * devcontainer bind-mounts /var/run/docker.sock rather than nesting docker-in-docker),
 * so proof-server.yml's default bridge network is unreachable from here: from inside
 * the devcontainer, 127.0.0.1:6300 refers to the devcontainer's own loopback, not the
 * proof server's. proof-server.devcontainer.yml works around this by sharing network
 * namespaces with the devcontainer (`network_mode: container:<devcontainer id>`), which
 * makes the proof server bind directly onto the devcontainer's own loopback instead.
 */
export const isDevcontainer = (): boolean =>
  process.env.REMOTE_CONTAINERS === "true";

export const isProofServerRunning = (
  proofServerUrl: string,
): Promise<boolean> => {
  const { hostname, port } = new URL(proofServerUrl);
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: hostname,
      port: Number(port),
      timeout: 1000,
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });
};
