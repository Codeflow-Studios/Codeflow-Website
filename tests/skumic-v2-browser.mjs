/**
 * Browser acceptance checks for the shipped Skumic game, without extra dependencies.
 * Build and start the website first, then: node tests/skumic-v2-browser.mjs
 * Optional: SKUMIC_QA_URL, PLAYWRIGHT_MODULE_PATH, CHROME_PATH, SKUMIC_QA_OUTPUT.
 * The exported game objects are used only to arrange deterministic timing/collision
 * scenarios; keyboard, pointer and touch input still go through browser events.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const runtime = process.env.PLAYWRIGHT_MODULE_PATH || 'C:/Users/G/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const requireRuntime = createRequire(path.join(runtime, '_skumic-qa.cjs'));
const { chromium } = requireRuntime('playwright');
const url = process.env.SKUMIC_QA_URL || 'http://127.0.0.1:8787/skumic-game/';
const output = path.resolve(process.env.SKUMIC_QA_OUTPUT || 'outputs/skumic-v2');
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ executablePath, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const report = { url, checkedAt: new Date().toISOString(), checks: [], metrics: {}, errors: [] };
let failureCount = 0;

async function check(name, fn) {
  const started = performance.now();
  try {
    const evidence = await fn();
    report.checks.push({ name, passed: true, ms: Math.round(performance.now() - started), evidence });
    console.log(`PASS ${name}`);
  } catch (error) {
    failureCount++;
    report.checks.push({ name, passed: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}

async function openGame(name, viewport, touch = false, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch, reducedMotion });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => report.errors.push({ name, kind: 'runtime', text: error.message }));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push({ name, kind: 'console', text: message.text() });
  });
  await page.goto(url);
  await page.evaluate(async () => {
    window.__qaGame = await import('./game.js');
    window.__qaEngine = await import('./engine.js');
    await document.fonts.ready;
  });
  await page.locator('#start').waitFor({ state: 'visible' });
  return { name, context, page, requests, touch };
}

async function state(page) {
  return page.evaluate(() => {
    const game = window.__qaGame;
    return { ...game.getGameState(), time: game.model.time, score: game.model.score, lane: game.model.lane, x: game.model.x, jumpAge: game.model.jumpAge, lives: game.model.lives, combo: game.model.combo, boost: game.model.boost };
  });
}

async function waitMode(page, wanted) {
  await page.waitForFunction(mode => window.__qaGame.getGameState().mode === mode, wanted);
}

async function screenshot(game, label) {
  await game.page.screenshot({ path: path.join(output, `${game.name}-${label}.png`), fullPage: true });
}

async function inViewport(page, selector) {
  const bounds = await page.locator(selector).boundingBox();
  assert.ok(bounds && bounds.width > 0 && bounds.height > 0, `${selector} must be visible`);
  const viewport = page.viewportSize();
  assert.ok(bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, `${selector} outside viewport: ${JSON.stringify(bounds)}`);
  return bounds;
}

async function touchGesture(game, dx = 0, dy = 0) {
  const bounds = await game.page.locator('#game').boundingBox();
  const x = Math.round(bounds.x + bounds.width * .5), y = Math.round(bounds.y + bounds.height * .52);
  const cdp = await game.context.newCDPSession(game.page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  if (dx || dy) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function arrangeTime(page, time) {
  await page.evaluate(targetTime => {
    const { model, audio } = window.__qaGame;
    // Freeze transport at a known point, independent of test runner latency.
    Object.defineProperty(audio, 'time', { configurable: true, get: () => targetTime });
    audio.sampleTime = () => targetTime;
    model.time = targetTime;
    model.objects = [];
    model.spawnIn = 99;
    model.jumpAge = -1;
    model.done = false;
  }, time);
}

async function restoreTransport(page) {
  await page.evaluate(() => {
    const { audio, model } = window.__qaGame;
    delete audio.time;
    delete audio.sampleTime;
    audio.start(model.time);
  });
}

try {
  for (const [name, viewport, touch] of [
    ['desktop', { width: 1920, height: 1080 }, false],
    ['small-desktop', { width: 1024, height: 768 }, false],
    ['portrait', { width: 390, height: 844 }, true],
    ['landscape', { width: 844, height: 390 }, true],
  ]) {
    const game = await openGame(name, viewport, touch);
    const { page } = game;

    await check(`${name}: selection layout and lazy background loading`, async () => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'horizontal page overflow');
      await inViewport(page, '#start');
      for (const id of ['#level-1', '#level-2', '#level-3', '#level-4', '#character-1', '#character-2']) {
        assert.ok(await page.locator(id).isVisible(), `${id} missing`);
      }
      if (viewport.width > 760) {
        const portraitFrame = await page.locator('.character-card').evaluate(element => ({
          background: getComputedStyle(element).backgroundColor,
          border: getComputedStyle(element).borderStyle,
          overflow: getComputedStyle(element).overflow,
          overlay: getComputedStyle(element, '::after').display,
        }));
        assert.deepEqual(portraitFrame, { background: 'rgba(0, 0, 0, 0)', border: 'none', overflow: 'visible', overlay: 'none' });
      }
      assert.equal(game.requests.some(request => /background-(ravy|puber|manosfeer)-v2\./.test(request)), false, 'unused level backgrounds loaded at first paint');
      await screenshot(game, 'selection');
    });

    await check(`${name}: countdown freezes timer and score`, async () => {
      await page.locator('#start').click();
      await waitMode(page, 'countdown');
      const during = await state(page);
      assert.equal(during.time, 0);
      assert.equal(during.score, 0);
      assert.ok(await page.locator('#countdown').isVisible());
      const countdownBounds = await page.locator('#level-intro').boundingBox();
      const gameBounds = await page.locator('#game').boundingBox();
      const background = await page.locator('#level-intro').evaluate(element => getComputedStyle(element).backgroundColor);
      assert.ok(background === 'rgba(0, 0, 0, 0)' || countdownBounds.height < gameBounds.height * .4, 'intro blocks most of the road');
      await screenshot(game, 'countdown');
      await waitMode(page, 'playing');
      assert.ok((await state(page)).time < .3, 'game clock started before control');
    });

    await check(`${name}: theater fits gameplay and controls`, async () => {
      assert.equal(await page.locator('body').evaluate(element => element.classList.contains('theater')), true);
      await inViewport(page, '#game');
      await inViewport(page, '#pause');
      await inViewport(page, '#sound');
      await inViewport(page, '#exit-theater');
      if (touch) {
        for (const id of ['#left', '#right', '#jump']) {
          const bounds = await inViewport(page, id);
          assert.ok(bounds.width >= 44 && bounds.height >= 44, `${id} undersized touch target`);
        }
        assert.equal(await page.locator('#game').evaluate(element => getComputedStyle(element).touchAction), 'none');
      }
      await screenshot(game, 'playing');
    });

    await check(`${name}: grounded camera follow stays subtle while the HUD remains fixed`, async () => {
      await page.waitForFunction(() => {
        const camera = window.__qaGame.getCameraState();
        return Math.abs(camera.x) > .03 || Math.abs(camera.y) > .03;
      });
      const samples = await page.evaluate(() => new Promise(resolve => {
        const values = [];
        const collect = () => {
          values.push(window.__qaGame.getCameraState());
          if (values.length === 30) resolve(values);
          else requestAnimationFrame(collect);
        };
        requestAnimationFrame(collect);
      }));
      const maxX = Math.max(...samples.map(value => Math.abs(value.x)));
      const maxY = Math.max(...samples.map(value => Math.abs(value.y)));
      assert.ok(maxX > .03 || maxY > .03, 'camera remains completely static');
      assert.ok(maxX < 3.5 && maxY < 5.5, `camera movement too strong: ${maxX}, ${maxY}`);
      const hudTransform = await page.locator('#hud').evaluate(element => getComputedStyle(element).transform);
      assert.equal(hudTransform, 'none');
      return { maxX, maxY };
    });

    await check(`${name}: street texture moves toward the player in perspective`, async () => {
      const before = await page.evaluate(() => window.__qaGame.getRoadMotionState());
      await page.waitForTimeout(180);
      const after = await page.evaluate(() => window.__qaGame.getRoadMotionState());
      const moving = before.map((mark, index) => ({ before: mark, after: after[index] }))
        .find(pair => pair.before.z > 25 && pair.before.z < 100 && pair.after.z < pair.before.z);
      assert.ok(moving, 'no road detail remained inside the visible cycle');
      assert.ok(moving.after.y > moving.before.y, `road detail did not approach: ${JSON.stringify(moving)}`);
      assert.ok(moving.after.scale > moving.before.scale, `road detail did not grow: ${JSON.stringify(moving)}`);
      return moving;
    });

    await check(`${name}: responsive keyboard or real touch input`, async () => {
      if (touch) {
        await touchGesture(game, -65);
        assert.equal((await state(page)).lane, 0, 'left swipe missed');
        await touchGesture(game, 65);
        assert.equal((await state(page)).lane, 1, 'right swipe missed');
        await touchGesture(game);
      } else {
        await page.keyboard.press('ArrowLeft');
        assert.equal((await state(page)).lane, 0, 'left input missed');
        await page.waitForTimeout(130);
        assert.ok((await state(page)).x < .25, 'lane switch too slow');
        await page.keyboard.press('ArrowRight');
        assert.equal((await state(page)).lane, 1, 'right input missed');
        await page.keyboard.press('Space');
      }
      assert.ok((await state(page)).jumpAge >= 0, 'jump input missed');
      await page.waitForTimeout(80);
      const camera = await page.evaluate(() => window.__qaGame.getCameraState());
      assert.ok(Math.abs(camera.x) > .12 || Math.abs(camera.y) > .3, `camera did not follow the action: ${JSON.stringify(camera)}`);
    });

    await check(`${name}: pause freezes gameplay; mute and resume work`, async () => {
      await page.locator('#pause').click();
      await waitMode(page, 'paused');
      const before = await state(page);
      await page.waitForTimeout(180);
      const after = await state(page);
      assert.equal(before.time, after.time);
      assert.equal(before.score, after.score);
      await page.locator('#resume').click();
      await waitMode(page, 'playing');
      const label = await page.locator('#sound').getAttribute('aria-label');
      await page.locator('#sound').click();
      assert.notEqual(await page.locator('#sound').getAttribute('aria-label'), label);
      await page.locator('#sound').click();
      assert.equal(await page.locator('#sound').getAttribute('aria-label'), label);
    });

    await check(`${name}: frame cadence`, async () => {
      const samples = await page.evaluate(() => new Promise(resolve => {
        let previous = 0;
        const intervals = [];
        const collect = now => {
          if (previous) intervals.push(now - previous);
          previous = now;
          if (intervals.length >= 120) resolve(intervals);
          else requestAnimationFrame(collect);
        };
        requestAnimationFrame(collect);
      }));
      const sorted = [...samples].sort((a, b) => a - b);
      const metrics = { averageMs: samples.reduce((sum, n) => sum + n, 0) / samples.length, p95Ms: sorted[Math.floor(sorted.length * .95)], longFrames: samples.filter(n => n > 34).length };
      report.metrics[name] = metrics;
      assert.ok(metrics.p95Ms < 35, `frame cadence regression: ${JSON.stringify(metrics)}`);
      return metrics;
    });

    await check(`${name}: tutorial disappears and remains dismissed after retry`, async () => {
      await page.waitForFunction(() => document.getElementById('tutorial').hidden, undefined, { timeout: 5000 });
      await page.evaluate(() => { window.__qaGame.model.done = true; });
      await waitMode(page, 'finished');
      await inViewport(page, '#restart');
      await inViewport(page, '#level-menu');
      await screenshot(game, 'results');
      const started = performance.now();
      await page.locator('#restart').click();
      await waitMode(page, 'playing');
      assert.ok(performance.now() - started < 1000, 'retry took longer than one second');
      assert.equal(await page.locator('#tutorial').isVisible(), false);
      assert.equal(await page.locator('#countdown').isVisible(), false);
    });

    await check(`${name}: Ravy timer stays fully visible during a drop`, async () => {
      const drop = await page.evaluate(() => window.__qaEngine.MUSIC.boostWindows[0][0]);
      await arrangeTime(page, drop + .1);
      await page.evaluate(() => {
        const game = window.__qaGame;
        game.model.update(.001);
        game.model.events.forEach(game.handleEvent);
        game.updateUI();
      });
      assert.equal((await state(page)).boost, true);
      const timer = await inViewport(page, '#ravy-status');
      if (name === 'portrait') {
        const hud = await page.locator('#hud').boundingBox();
        assert.ok(timer.y > hud.y + hud.height, 'Ravy timer overlaps the top HUD');
        assert.ok(timer.y + timer.height < page.viewportSize().height * .3, 'Ravy timer is not anchored below the HUD');
      }
      await screenshot(game, 'ravy-visible');
      await restoreTransport(page);
      // The drop banner intentionally outranks beat feedback for 950 ms. Let it
      // expire before the following scenario rewinds to a normal beat.
      await page.waitForFunction(() => !document.getElementById('feedback').classList.contains('show'));
    });

    if (name === 'portrait') {
      await check('mobile: rotation preserves run and fits controls', async () => {
        const before = await state(page);
        await page.setViewportSize({ width: 844, height: 390 });
        await page.waitForTimeout(100);
        await inViewport(page, '#game');
        await inViewport(page, '#jump');
        assert.equal((await state(page)).mode, 'playing');
        assert.ok((await state(page)).time >= before.time);
        await screenshot(game, 'rotated');
        await page.setViewportSize(viewport);
        await page.waitForTimeout(100);
        await inViewport(page, '#game');
      });
    }

    if (name === 'desktop') {
      await check('desktop: PERFECT/GOOD grading drives visible beat streak', async () => {
        const beat = await page.evaluate(() => window.__qaEngine.BEAT);
        const offset = await page.evaluate(() => window.__qaEngine.MUSIC.beatOffset);
        await arrangeTime(page, offset + beat * 6);
        await page.keyboard.press('Space');
        assert.match(await page.locator('#feedback').textContent(), /PERFECT/i);
        assert.equal((await state(page)).combo, 1);
        await arrangeTime(page, offset + beat * 8 + .11);
        await page.keyboard.press('Space');
        assert.match(await page.locator('#feedback').textContent(), /GOOD/i);
        assert.equal((await state(page)).combo, 2);
        await restoreTransport(page);
      });

      await check('desktop: collisions cost a life and drop activates Ravy Mode', async () => {
        await page.evaluate(() => {
          const game = window.__qaGame;
          game.model.jumpAge = -1;
          game.model.invincible = 0;
          game.model.objects = [{ type: 'barrier', lane: game.model.x, z: 5.01, checked: false }];
        });
        await page.waitForFunction(() => window.__qaGame.model.lives === 2);
        assert.match(await page.locator('#lives').getAttribute('aria-label'), /2/);
        await page.evaluate(() => {
          const game = window.__qaGame;
          const engine = window.__qaEngine;
          const drop = engine.MUSIC.boostWindows[0][0];
          game.model.time = drop - .01;
          game.model.objects = [];
          game.model.update(.02);
          game.model.events.forEach(game.handleEvent);
          game.audio.start(game.model.time);
          game.updateUI();
        });
        assert.equal((await state(page)).boost, true);
        assert.ok(await page.locator('#ravy-status').isVisible());
        assert.match(await page.locator('#ravy-status').textContent(), /RAVY/i);
        await screenshot(game, 'ravy');
        const lives = (await state(page)).lives;
        await page.evaluate(() => {
          const { model } = window.__qaGame;
          model.jumpAge = -1;
          model.invincible = 0;
          model.objects = [{ type: 'barrier', lane: model.x, z: 5.01, checked: false }];
        });
        await page.waitForTimeout(100);
        assert.equal((await state(page)).lives, lives, 'Ravy obstacle incorrectly removes life');
      });

      await check('desktop: hidden tab pauses and can resume without simulation jump', async () => {
        const before = (await state(page)).time;
        // Headless does not consistently hide background tabs. Dispatch the same
        // browser lifecycle event against a temporary hidden-state getter.
        await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await waitMode(page, 'paused');
        await page.waitForTimeout(180);
        assert.ok(Math.abs((await state(page)).time - before) < .1);
        await page.evaluate(() => {
          delete document.hidden;
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await page.locator('#resume').click();
        await waitMode(page, 'playing');
        assert.ok((await state(page)).time - before < .3);
      });

      await check('desktop: per-level best persists across refresh', async () => {
        await page.evaluate(() => {
          const model = window.__qaGame.model;
          model.score = 18450; model.maxCombo = 14; model.done = true;
        });
        await waitMode(page, 'finished');
        assert.match(await page.locator('#result-flow').textContent(), /14/);
        await page.evaluate(() => {
          // Exercise score sharing without sending anything or touching the
          // workstation clipboard; only the browser capability is stubbed.
          Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
          Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__qaSharedText = text; } } });
        });
        await page.locator('#share').click();
        const sharedText = await page.evaluate(() => window.__qaSharedText);
        assert.match(sharedText, /SKUMIC|Skumic/);
        assert.match(sharedText, /18[.,\s]?450/);
        await page.locator('#level-menu').click();
        await waitMode(page, 'ready');
        assert.match(await page.locator('#selected-best').textContent(), /18[.,\s]?450/);
        await page.locator('#level-2').click();
        assert.doesNotMatch(await page.locator('#selected-best').textContent(), /18[.,\s]?450/);
        await page.reload();
        await page.locator('#start').waitFor({ state: 'visible' });
        assert.match(await page.locator('#selected-best').textContent(), /18[.,\s]?450/);
        await page.evaluate(async () => { window.__qaGame = await import('./game.js'); window.__qaEngine = await import('./engine.js'); });
        await page.locator('#start').click();
        await waitMode(page, 'playing');
        assert.equal(await page.locator('#tutorial').isVisible(), false);
      });
    }

    await check(`${name}: Escape exits theater safely`, async () => {
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('body').evaluate(element => element.classList.contains('theater')), false);
      assert.notEqual((await state(page)).mode, 'playing', 'run continues unattended after leaving theater');
    });
    await game.context.close();
  }

  const tracks = await openGame('tracks', { width: 1280, height: 800 });
  const backgroundAssets = ['background-oostende-v2.png', 'background-ravy-v2.png', 'background-puber-v2.png', 'background-manosfeer-v2.png'];
  for (let index = 0; index < 4; index++) {
    await check(`track ${index + 1}: supplied recording, artwork and selectable runner`, async () => {
      const { page } = tracks;
      await page.locator(`#level-${index + 1}`).click();
      await page.locator(`#character-${index % 2 + 1}`).click();
      assert.equal((await state(page)).selectedCharacter, index % 2 + 1);
      await page.locator('#start').click();
      await waitMode(page, 'playing');
      await page.waitForTimeout(5500);
      const playback = await page.evaluate(() => {
        const { audio, model } = window.__qaGame;
        return { active: audio.active, enabled: audio.enabled, source: audio.bufferSrc, expected: model.level.src, duration: audio.buffer?.duration, time: audio.time, gameTime: model.time, cachedExcerpts: audio.cache.size, objects: model.objects.length };
      });
      assert.equal(playback.active, true);
      assert.equal(playback.enabled, true);
      assert.equal(playback.source, playback.expected);
      assert.equal(playback.duration, 45);
      assert.ok(playback.cachedExcerpts <= 2);
      assert.ok(playback.objects > 0, 'normal spawning did not run');
      assert.ok(tracks.requests.some(request => request.includes(backgroundAssets[index])), `level ${index + 1} synchronized background was not loaded`);
      const perspective = await page.evaluate(() => window.__qaGame.getPerspectiveState());
      assert.ok(Math.abs(perspective.far.y - perspective.horizon) < .01, 'road does not meet the background horizon');
      assert.ok(perspective.horizon > perspective.height * .3 && perspective.horizon < perspective.height * .5, 'background horizon falls outside the playable composition');
      assert.ok(Math.abs(playback.time - playback.gameTime) < .08, 'simulation drifted from the audio clock');
      await screenshot(tracks, `level-${index + 1}-gameplay`);
      await page.locator('#pause').click();
      await page.locator('#pause-levels').click();
      await waitMode(page, 'ready');
      return playback;
    });
  }

  await check('audio interruption pauses and resumes the actual recording', async () => {
    const { page } = tracks;
    await page.locator('#start').click();
    await waitMode(page, 'playing');
    await page.waitForTimeout(200);
    await page.evaluate(() => window.__qaGame.audio.ctx.suspend());
    await waitMode(page, 'paused');
    const before = await state(page);
    await page.waitForTimeout(200);
    assert.equal((await state(page)).time, before.time);
    await page.locator('#resume').click();
    await waitMode(page, 'playing');
    await page.waitForTimeout(100);
    assert.ok((await state(page)).time - before.time < .3);
    assert.equal(await page.evaluate(() => window.__qaGame.audio.ctx.state), 'running');
    await page.locator('#pause').click();
    await page.locator('#pause-levels').click();
  });

  await check('countdown pause keeps the timer and score at zero', async () => {
    const { page } = tracks;
    await page.locator('#level-1').click();
    await page.locator('#start').click();
    await waitMode(page, 'countdown');
    await page.keyboard.press('KeyP');
    await waitMode(page, 'paused');
    const before = await state(page);
    await page.waitForTimeout(250);
    const after = await state(page);
    assert.equal(after.time, 0); assert.equal(after.score, 0);
    assert.equal(after.countdownLeft, before.countdownLeft);
    await page.locator('#resume').click();
    await waitMode(page, 'playing');
  });

  await check('three actual collisions end the run; keyboard retry starts immediately', async () => {
    const { page } = tracks;
    for (const lives of [2, 1, 0]) {
      await page.evaluate(() => {
        const { model } = window.__qaGame;
        model.jumpAge = -1; model.invincible = 0;
        model.objects = [{ type: 'barrier', lane: model.x, z: 5.01, checked: false }];
      });
      await page.waitForFunction(expected => window.__qaGame.model.lives === expected, lives);
    }
    await waitMode(page, 'finished');
    assert.match(await page.locator('#result-title').textContent(), /GAME OVER/);
    const started = performance.now();
    await page.keyboard.press('Enter');
    await waitMode(page, 'playing');
    assert.ok(performance.now() - started < 1000);
    assert.equal((await state(page)).lives, 3);
  });

  await check('complete 45-second recording reaches results without clock stalls', async () => {
    const { page } = tracks;
    // Keep the real track, simulation, spawns and duration; prevent unattended death.
    await page.evaluate(() => { window.__qaGame.model.invincible = 100; });
    await page.waitForFunction(() => window.__qaGame.getGameState().mode === 'finished', undefined, { timeout: 48000 });
    assert.equal((await state(page)).time, 45);
    assert.equal(await page.evaluate(() => window.__qaGame.audio.active), false);
    assert.match(await page.locator('#result-title').textContent(), /DIJK VAN/);
    await page.locator('#next-level').click();
    await waitMode(page, 'countdown');
    assert.equal((await state(page)).selectedLevel, 1);
    assert.equal((await state(page)).time, 0);
    assert.equal((await state(page)).score, 0);
  });
  await tracks.context.close();

  const failure = await openGame('audio-recovery', { width: 1024, height: 768 });
  await check('failed decode falls back to play; sound can recover during the run', async () => {
    const { page } = failure;
    // A corrupt successful response exercises the real decoder failure without
    // introducing an expected HTTP error into the clean-console assertions.
    await page.route('**/*.mp3', route => route.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'invalid audio fixture' }));
    await page.locator('#start').click();
    await waitMode(page, 'playing');
    await page.waitForTimeout(250);
    assert.ok((await state(page)).time > .1);
    assert.equal(await page.evaluate(() => window.__qaGame.audio.active), false);
    assert.match(await page.locator('#feedback').textContent(), /ZONDER GELUID/);
    await page.unroute('**/*.mp3');
    const before = (await state(page)).time;
    await page.locator('#sound').click();
    await page.waitForFunction(() => window.__qaGame.audio.active);
    assert.equal(await page.evaluate(() => window.__qaGame.audio.enabled), true);
    assert.ok((await state(page)).time >= before);
    assert.equal((await state(page)).mode, 'playing');
  });
  await failure.context.close();

  const reduced = await openGame('reduced-motion', { width: 1024, height: 768 }, false, 'reduce');
  await check('reduced motion: gameplay works with stable camera', async () => {
    const { page } = reduced;
    await page.locator('#start').click();
    await waitMode(page, 'playing');
    await page.keyboard.press('Space');
    assert.ok((await state(page)).jumpAge >= 0);
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    await page.waitForTimeout(150);
    assert.deepEqual(await page.evaluate(() => window.__qaGame.getCameraState()), { x: 0, y: 0 });
    const transforms = await page.evaluate(() => ['game', 'game-frame'].map(id => getComputedStyle(document.getElementById(id)).transform));
    assert.deepEqual(transforms, ['none', 'none']);
    await screenshot(reduced, 'playing');
  });
  await reduced.context.close();
  await check('all viewports: no new runtime or console errors', async () => assert.deepEqual(report.errors, []));
} finally {
  await browser.close();
  report.passed = failureCount === 0;
  await writeFile(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`\n${report.checks.filter(check => check.passed).length}/${report.checks.length} checks passed. Report: ${path.join(output, 'browser-report.json')}`);
}

process.exitCode = failureCount ? 1 : 0;
