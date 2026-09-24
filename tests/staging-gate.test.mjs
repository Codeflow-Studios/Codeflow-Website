import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { startStagingGate } from '../scripts/staging-gate.mjs';

test('the staging gate protects pages and API requests with a signed session', async () => {
  const upstream = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'text/plain' });
    response.end(`upstream:${request.url}`);
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const gate = await startStagingGate({
    password: 'test-secret', port: 0, upstreamPort: upstream.address().port,
  });
  const base = `http://127.0.0.1:${gate.address().port}`;

  try {
    const locked = await fetch(`${base}/dashboard?lang=nl`, { redirect: 'manual' });
    assert.equal(locked.status, 302);
    assert.match(locked.headers.get('location'), /__staging\/login/);

    const publicGame = await fetch(`${base}/skumic-game/index.html`);
    assert.equal(publicGame.status, 200);
    assert.equal(await publicGame.text(), 'upstream:/skumic-game/index.html');

    const login = await fetch(`${base}${locked.headers.get('location')}`);
    assert.equal(login.status, 200);
    assert.match(await login.text(), /testomgeving van Codeflow Studios/i);

    const rejected = await fetch(`${base}/__staging/login`, {
      method: 'POST', body: new URLSearchParams({ password: 'wrong', next: '/dashboard' }), redirect: 'manual',
    });
    assert.equal(rejected.status, 401);

    const accepted = await fetch(`${base}/__staging/login`, {
      method: 'POST', body: new URLSearchParams({ password: 'test-secret', next: '/dashboard?lang=nl' }), redirect: 'manual',
    });
    assert.equal(accepted.status, 303);
    assert.equal(accepted.headers.get('location'), '/dashboard?lang=nl');
    const cookie = accepted.headers.get('set-cookie').split(';')[0];
    assert.match(accepted.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);

    const open = await fetch(`${base}/dashboard?lang=nl`, { headers: { cookie } });
    assert.equal(open.status, 200);
    assert.equal(await open.text(), 'upstream:/dashboard?lang=nl');
    assert.equal(open.headers.get('x-robots-tag'), 'noindex, nofollow');

    const apiBlocked = await fetch(`${base}/api/marketing/trends`, { method: 'POST', redirect: 'manual' });
    assert.equal(apiBlocked.status, 401);

    const tampered = await fetch(`${base}/dashboard`, { headers: { cookie: `${cookie}0` }, redirect: 'manual' });
    assert.equal(tampered.status, 302);

    const unsafeNext = await fetch(`${base}/__staging/login`, {
      method: 'POST', body: new URLSearchParams({ password: 'test-secret', next: '//example.com' }), redirect: 'manual',
    });
    assert.equal(unsafeNext.headers.get('location'), '/');
  } finally {
    await new Promise((resolve) => gate.close(resolve));
    await new Promise((resolve) => upstream.close(resolve));
  }
});

test('the test environment can also protect the game route', async () => {
  const upstream = createServer((_request, response) => response.end('game'));
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const gate = await startStagingGate({
    password: 'test-secret', port: 0, upstreamPort: upstream.address().port,
    allowPublicGame: false,
  });

  try {
    const response = await fetch(`http://127.0.0.1:${gate.address().port}/skumic-game/`, { redirect: 'manual' });
    assert.equal(response.status, 302);
    assert.match(response.headers.get('location'), /__staging\/login/);
  } finally {
    await new Promise((resolve) => gate.close(resolve));
    await new Promise((resolve) => upstream.close(resolve));
  }
});
