import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

const runtime = process.env.PLAYWRIGHT_MODULE_PATH || 'C:/Users/G/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const requireRuntime = createRequire(path.join(runtime, '_skumic-intro-qa.cjs'));
const { chromium } = requireRuntime('playwright');
const url = process.env.SKUMIC_QA_URL || 'http://127.0.0.1:4175/skumic-game/';
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({ executablePath, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

const response = await page.goto(url, { waitUntil: 'networkidle' });
assert.equal(response?.status(), 200);
await page.locator('#codeflow-intro').waitFor({ state: 'visible' });
const intro = await page.locator('#codeflow-intro-video').evaluate(video => ({
  autoplay: video.autoplay,
  muted: video.muted,
  paused: video.paused,
  volume: video.volume,
  readyState: video.readyState,
  source: video.currentSrc,
}));
assert.equal(intro.autoplay, true, 'intro must request autoplay');
assert.equal(intro.muted, false, 'intro sound must default to on');
assert.equal(intro.paused, false, 'intro must be playing automatically');
assert.equal(intro.volume, 1, 'intro volume must default to full');
assert.ok(intro.readyState >= 2, 'intro video must load playable data');
assert.match(intro.source, /codeflow-studios-intro\.mp4$/);
assert.equal(await page.locator('#codeflow-intro-sound').textContent(), 'SOUND ON');

await page.locator('#codeflow-intro-skip').click();
await page.locator('#codeflow-intro').waitFor({ state: 'detached' });
await page.locator('#start').waitFor({ state: 'visible' });
assert.equal(await page.locator('#start').isEnabled(), true);
assert.equal(errors.length, 0, errors.join('\n'));

console.log(JSON.stringify({ url, intro, startVisible: true, errors }, null, 2));
await browser.close();
