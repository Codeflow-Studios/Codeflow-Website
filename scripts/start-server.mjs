import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./sites-env.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const wranglerPath = path.join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");
const port = process.env.PORT || "8787";
const stagingPassword = process.env.STAGING_PASSWORD;
const workerPort = stagingPassword ? (process.env.STAGING_INTERNAL_PORT || "8788") : port;

const child = spawn(
  process.execPath,
  [
    wranglerPath,
    "dev",
    "--config",
    path.join(projectRoot, "dist", "server", "wrangler.json"),
    "--local",
    "--persist-to",
    path.join(projectRoot, ".wrangler", "state"),
    "--ip",
    stagingPassword ? "127.0.0.1" : "0.0.0.0",
    "--port",
    workerPort,
    "--inspector-port",
    "0",
  ],
  { stdio: "inherit", env: process.env },
);

const gate = stagingPassword
  ? await (await import('./staging-gate.mjs')).startStagingGate({
      password: stagingPassword,
      port: Number(port),
      upstreamPort: Number(workerPort),
    })
  : null;

if (gate) console.log(`Staging gate ready on port ${port}`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    gate?.close();
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

