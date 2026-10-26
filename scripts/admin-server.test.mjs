import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request, createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createAdminServer, hashPassword } from './admin-server.mjs';
import { routes } from './admin-content.mjs';

test('admin security and actual HTTP login lifecycle', async t => {
  const password = randomBytes(24).toString('hex');
  let now = Date.now();
  const upstream = createServer((req, res) => res.end('public upstream'));
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const env = { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD_HASH: await hashPassword(password), ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'), ADMIN_ORIGIN: 'https://admin.example.test' };
  env.RAILWAY_GIT_COMMIT_SHA = 'a'.repeat(40);
  const server = createAdminServer({ upstreamPort: upstream.address().port, env, now: () => now });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.close(); upstream.close(); });
  const call = (path, { method = 'GET', body, headers = {} } = {}) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path, method, headers: { host: 'admin.example.test', ...headers } }, res => {
      let text = ''; res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    }); req.on('error', reject); req.end(body);
  });
  const challenge = async () => {
    const result = await call('/admin/login');
    assert.equal(result.status, 200);
    assert.equal(result.headers['referrer-policy'], 'same-origin', 'form POST must retain its same-origin Origin header');
    return { cookie: result.headers['set-cookie'][0].split(';')[0], csrf: /name="csrf" value="([^"]+)"/.exec(result.text)[1] };
  };
  const post = (path, form, cookie, origin = env.ADMIN_ORIGIN) => call(path, { method: 'POST', body: new URLSearchParams(form).toString(), headers: { origin, cookie, 'content-type': 'application/x-www-form-urlencoded' } });
  assert.equal((await call('/')).text, 'public upstream');
  for (const path of ['/admin','/admin/','/admin/private','/%61dmin','/admin/finance','/admin/finance/','/admin/finance/app.css','/admin/finance/_blazor/negotiate']) {
    const result = await call(path); assert.equal(result.status, 303); assert.equal(result.headers.location, '/admin/login'); assert.ok(!result.text.includes('Marketing AI'));
  }
  assert.equal((await call('/admin', { headers: { cookie: '__Host-codeflow_admin=forged' } })).status, 303);
  assert.equal((await call('/admin', { headers: { host: 'evil.test' } })).status, 400);
  let c = await challenge();
  assert.equal((await post('/admin/login', { username: 'admin', password, csrf: c.csrf }, c.cookie, 'https://evil.test')).status, 403);
  assert.equal((await post('/admin/login', { username: 'admin', password, csrf: 'forged' }, c.cookie)).status, 403);
  assert.equal((await post('/admin/login', { username: 'admin', password: 'wrong', csrf: c.csrf }, c.cookie)).status, 401);
  c = await challenge();
  const login = await post('/admin/login', { username: 'admin', password, csrf: c.csrf }, c.cookie);
  assert.equal(login.status, 303);
  const session = login.headers['set-cookie'][0];
  for (const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/']) assert.ok(session.includes(flag));
  const sessionCookie = session.split(';')[0];
  const dashboard = await call('/admin', { headers: { cookie: sessionCookie } });
  assert.equal(dashboard.status, 200); assert.match(dashboard.text, /What’s Next/); assert.match(dashboard.text, /https:\/\/www.codeflowstudios.be\/webmail/);
  assert.match(dashboard.text, /href="\/admin\/finance\/"/);
  assert.equal((await call('/admin/finance/', { headers: { cookie: sessionCookie } })).status, 503, 'finance without configured upstream stays closed');
  assert.match(dashboard.headers['cache-control'], /no-store/); assert.equal(dashboard.headers['x-robots-tag'], 'noindex, nofollow');
  assert.equal(dashboard.headers['x-codeflow-admin-revision'], env.RAILWAY_GIT_COMMIT_SHA);
  assert.ok(!dashboard.text.includes(password)); assert.ok(!dashboard.text.includes(env.ADMIN_PASSWORD_HASH));
  const csrf = /name="csrf" value="([^"]+)"/.exec(dashboard.text)[1];
  assert.equal((await post('/admin/logout', { csrf: 'wrong' }, sessionCookie)).status, 403);
  assert.equal((await post('/admin/logout', { csrf }, sessionCookie)).status, 303);
  assert.equal((await call('/admin', { headers: { cookie: sessionCookie } })).status, 303);
  c = await challenge();
  const secondLogin = await post('/admin/login', { username: 'admin', password, csrf: c.csrf }, c.cookie);
  const secondCookie = secondLogin.headers['set-cookie'][0].split(';')[0];
  now += 8 * 60 * 60 * 1000 + 1;
  assert.equal((await call('/admin', { headers: { cookie: secondCookie } })).status, 303);
  c = await challenge();
  for (let i = 0; i < 10; i++) assert.equal((await post('/admin/login', { username: 'admin', password: 'wrong', csrf: c.csrf }, c.cookie)).status, 401);
  assert.equal((await post('/admin/login', { username: 'admin', password, csrf: c.csrf }, c.cookie)).status, 429);
  now += 15 * 60 * 1000 + 1;
  assert.equal((await post('/admin/login', { username: 'admin', password, csrf: c.csrf }, c.cookie)).status, 403, 'expired CSRF');
  c = await challenge();
  assert.equal((await post('/admin/login', { username: 'admin', password, csrf: c.csrf }, c.cookie)).status, 303);
});

test('missing secrets fail closed and public site stays available', async t => {
  const server = createAdminServer({ upstreamPort: 1, env: {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const res = await fetch(`http://127.0.0.1:${server.address().port}/admin`);
  assert.equal(res.status, 503); assert.ok(!(await res.text()).includes('Marketing AI'));
});

test('curated links are real repository routes', () => {
  for (const [, route] of routes) {
    const path = route.replace(/\/$/, '');
    assert.ok(existsSync(new URL(`../app${path}/page.tsx`, import.meta.url)) || existsSync(new URL(`../public${path}/index.html`, import.meta.url)) || existsSync(new URL(`../public${path}`, import.meta.url)), route);
  }
});

test('finance uses the actual admin login and logout revokes its live websocket', async t => {
  const password = randomBytes(24).toString('hex');
  const backend = createServer((req, res) => { res.setHeader('content-security-policy', "script-src 'self'"); res.end('PRIVATE FINANCE'); });
  backend.on('upgrade', (req, socket) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
    socket.on('error', () => socket.destroy());
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const env = { ADMIN_USERNAME: 'admin', ADMIN_PASSWORD_HASH: await hashPassword(password), ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'), ADMIN_ORIGIN: 'https://admin.example.test', FLOWFINANCE_GATEWAY_KEY: randomBytes(32).toString('hex'), FLOWFINANCE_UPSTREAM: `http://127.0.0.1:${backend.address().port}` };
  const server = createAdminServer({ upstreamPort: backend.address().port, env });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); backend.closeAllConnections(); backend.close(); });
  const call = (path, options = {}) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path, method: options.method || 'GET', headers: { host: 'admin.example.test', ...options.headers } }, res => {
      let text = ''; res.on('data', chunk => text += chunk); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    }); req.on('error', reject); req.end(options.body);
  });
  const challenge = await call('/admin/login');
  const challengeCookie = challenge.headers['set-cookie'][0].split(';')[0];
  const challengeCsrf = /name="csrf" value="([^"]+)"/.exec(challenge.text)[1];
  const login = await call('/admin/login', { method: 'POST', headers: { origin: env.ADMIN_ORIGIN, cookie: challengeCookie, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: 'admin', password, csrf: challengeCsrf }).toString() });
  assert.equal(login.status, 303);
  const cookie = login.headers['set-cookie'][0].split(';')[0];
  const finance = await call('/admin/finance/', { headers: { cookie } });
  assert.equal(finance.status, 200); assert.equal(finance.text, 'PRIVATE FINANCE');
  assert.equal(finance.headers['content-security-policy'], "script-src 'self'");
  const socket = await new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: server.address().port, path: '/admin/finance/_blazor', headers: { host: 'admin.example.test', cookie, origin: env.ADMIN_ORIGIN, connection: 'Upgrade', upgrade: 'websocket' } });
    req.on('upgrade', (res, socket) => resolve(socket)); req.on('response', res => { res.resume(); reject(new Error('Upgrade rejected: ' + res.statusCode)); }); req.on('error', reject); req.end();
  });
  const closed = new Promise(resolve => socket.once('close', resolve));
  const dashboard = await call('/admin', { headers: { cookie } });
  const csrf = /name="csrf" value="([^"]+)"/.exec(dashboard.text)[1];
  const logout = await call('/admin/logout', { method: 'POST', headers: { origin: env.ADMIN_ORIGIN, cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrf }).toString() });
  assert.equal(logout.status, 303); await closed;
  const after = await call('/admin/finance/', { headers: { cookie } });
  assert.equal(after.status, 303); assert.equal(after.headers.location, '/admin/login'); assert.ok(!after.text.includes('PRIVATE FINANCE'));
});
