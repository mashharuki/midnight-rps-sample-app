import type { StartedDockerComposeEnvironment } from "testcontainers";

/** Map a container's first exposed port into the config URL. */
export const mapContainerPort = (
  env: StartedDockerComposeEnvironment,
  url: string,
  containerName: string,
): string => {
  const mappedUrl = new URL(url);
  const container = env.getContainer(containerName);
  mappedUrl.port = String(container.getFirstMappedPort());
  return mappedUrl.toString().replace(/\/+$/, "");
};
