import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./sites-env.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const wranglerPath = path.join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");
const port = process.env.PORT || "8787";
const stagingPassword = process.env.STAGING_PASSWORD;
const workerPort = process.env.WORKER_INTERNAL_PORT || "8788";

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
    "127.0.0.1",
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
      port: Number(process.env.STAGING_INTERNAL_PORT || "8789"),
      upstreamPort: Number(workerPort),
    })
  : null;

const { createAdminServer } = await import("./admin-server.mjs");
const adminServer = createAdminServer({ upstreamPort: gate ? Number(process.env.STAGING_INTERNAL_PORT || "8789") : Number(workerPort) });
adminServer.listen(Number(port), "0.0.0.0");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    adminServer.close();
    gate?.close();
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
