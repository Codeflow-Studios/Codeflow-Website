import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const apiRoutes = path.join(root, 'app', 'api');
const parkedApiRoutes = path.join(root, '.siteground-build-api');
const landingPage = path.join(root, 'app', 'page.tsx');
const parkedLandingPage = path.join(root, '.siteground-build-page.tsx');
const staticLandingPage = path.join(root, 'siteground', 'page.tsx');

if (!existsSync(apiRoutes) || existsSync(parkedApiRoutes)
  || !existsSync(landingPage) || existsSync(parkedLandingPage)) {
  throw new Error('SiteGround build inputs are missing or a previous build was interrupted.');
}

// Static export cannot include the Railway-backed server routes. Restore them
// even when the build fails, so the normal Railway build stays intact.
renameSync(apiRoutes, parkedApiRoutes);
renameSync(landingPage, parkedLandingPage);
try {
  copyFileSync(staticLandingPage, landingPage);
  const next = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
  const result = spawnSync(process.execPath, [next, 'build', '--webpack'], {
    cwd: root,
    env: { ...process.env, SITEGROUND_STATIC_EXPORT: '1' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
  if (process.exitCode === 0) {
    const output = path.join(root, 'out');
    const gameOutput = path.join(output, 'skumic-game');
    if (path.relative(output, gameOutput).startsWith('..')) {
      throw new Error('Game output is outside the SiteGround build directory.');
    }
    rmSync(gameOutput, { recursive: true, force: true });
    const proxyOutput = path.join(output, 'api', 'marketing');
    mkdirSync(proxyOutput, { recursive: true });
    copyFileSync(path.join(root, 'siteground', 'marketing-proxy.php'), path.join(proxyOutput, 'index.php'));
    copyFileSync(path.join(root, 'siteground', '.htaccess'), path.join(output, '.htaccess'));
  }
} finally {
  renameSync(parkedLandingPage, landingPage);
  renameSync(parkedApiRoutes, apiRoutes);
}
