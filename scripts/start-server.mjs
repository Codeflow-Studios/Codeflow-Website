import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import "./sites-env.mjs";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const wranglerPath = path.join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");
const port = process.env.PORT || "8787";

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
    "0.0.0.0",
    "--port",
    port,
    "--inspector-port",
    "0",
  ],
  { stdio: "inherit", env: process.env },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

