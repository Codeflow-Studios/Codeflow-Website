import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createFinanceProxy } from './admin-finance-proxy.mjs';

async function fixture(t, change = {}) {
  const key = randomBytes(32).toString('hex');
  const id = randomBytes(32).toString('hex');
  const sessions = new Map([[id, { expires: Date.now() + 60000 }]]);
  const received = [];
  const backend = createServer((req, res) => {
    let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => {
      received.push({ headers: req.headers, path: req.url, method: req.method, body });
      res.writeHead(200, { 'content-type': 'text/plain', 'content-security-policy': "script-src 'self'", 'cache-control': 'no-store' });
      res.end('private finance fixture');
    });
  });
  backend.on('upgrade', (req, socket, head) => {
    received.push({ headers: req.headers, path: req.url, upgrade: true });
    change.beforeUpgrade?.(sessions, id);
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
    if (head.length) socket.write(head);
    socket.on('data', data => socket.write(data));
    socket.on('error', () => socket.destroy());
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const env = { ADMIN_ORIGIN: 'https://admin.example.test', FLOWFINANCE_UPSTREAM: `http://127.0.0.1:${backend.address().port}`, FLOWFINANCE_GATEWAY_KEY: key, ...change.env };
  const proxy = createFinanceProxy({ env, sessions });
  const front = createServer((req, res) => { res.setHeader('content-security-policy', "default-src 'none'"); proxy.handle(req, res); });
  front.on('upgrade', proxy.upgrade);
  await new Promise(resolve => front.listen(0, '127.0.0.1', resolve));
  t.after(() => { proxy.close(); front.closeAllConnections(); front.close(); backend.closeAllConnections(); backend.close(); });
  const baseHeaders = { host: 'admin.example.test', cookie: `__Host-codeflow_admin=${id}; __Host-codeflow_login=challenge; other=kept` };
  const call = (path = '/admin/finance/', options = {}) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: front.address().port, path, method: options.method || 'GET', headers: { ...baseHeaders, ...options.headers } }, res => {
      let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }); req.on('error', reject); req.end(options.body);
  });
  const upgrade = (headers = {}) => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: front.address().port, path: '/admin/finance/_blazor?id=test', headers: { ...baseHeaders, origin: env.ADMIN_ORIGIN, connection: 'Upgrade', upgrade: 'websocket', ...headers } });
    req.on('upgrade', (response, socket) => resolve({ status: response.statusCode, socket }));
    req.on('response', response => { response.resume(); resolve({ status: response.statusCode }); });
    req.on('error', reject); req.end();
  });
  return { key, id, sessions, received, proxy, call, upgrade };
}

test('anonymous finance HTTP never reaches the backend', async t => {
  const f = await fixture(t);
  for (const path of ['/admin/finance/', '/admin/finance/app.css', '/admin/finance/_blazor/negotiate']) {
    assert.equal((await f.call(path, { headers: { cookie: '' } })).status, 403);
  }
  assert.equal(f.received.length, 0);
});
test('authenticated requests preserve the base path and strip admin credentials', async t => {
  const f = await fixture(t);
  const result = await f.call('/admin/finance/transactions?new=true', { headers: { 'x-codeflow-finance-key': 'forged', authorization: 'Bearer client-value', 'x-forwarded-host': 'evil.example' } });
  assert.equal(result.status, 200); assert.equal(result.body, 'private finance fixture');
  assert.equal(result.headers['content-security-policy'], "script-src 'self'");
  assert.equal(f.received[0].path, '/admin/finance/transactions?new=true');
  assert.equal(f.received[0].headers['x-codeflow-finance-key'], f.key);
  assert.equal(f.received[0].headers['x-forwarded-host'], 'admin.example.test');
  assert.equal(f.received[0].headers.authorization, undefined);
  assert.equal(f.received[0].headers.cookie, 'other=kept');
  assert.ok(!result.body.includes(f.key)); assert.equal(result.headers['x-codeflow-finance-key'], undefined);
});
test('finance writes require the exact same origin and preserve their body', async t => {
  const f = await fixture(t);
  assert.equal((await f.call('/admin/finance/_blazor/negotiate', { method: 'POST' })).status, 403);
  assert.equal((await f.call('/admin/finance/_blazor/negotiate', { method: 'POST', headers: { origin: 'https://evil.example' } })).status, 403);
  const good = await f.call('/admin/finance/_blazor/negotiate', { method: 'POST', headers: { origin: 'https://admin.example.test' }, body: 'negotiation' });
  assert.equal(good.status, 200); assert.equal(f.received[0].body, 'negotiation');
});
test('spoofed hosts and cross-site reads are refused', async t => {
  const f = await fixture(t);
  assert.equal((await f.call(undefined, { headers: { host: 'evil.example' } })).status, 403);
  assert.equal((await f.call(undefined, { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await f.call(undefined, { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403);
  assert.equal(f.received.length, 0);
});
test('an expired session cannot reach finance', async t => {
  const f = await fixture(t); f.sessions.get(f.id).expires = Date.now() - 1;
  assert.equal((await f.call()).status, 403);
});
test('missing finance configuration fails closed after admin authentication', async t => {
  const f = await fixture(t, { env: { FLOWFINANCE_UPSTREAM: undefined } });
  assert.equal((await f.call()).status, 503); assert.equal(f.received.length, 0);
});
test('upstream cannot point gateway credentials at a public third party', async t => {
  const f = await fixture(t, { env: { FLOWFINANCE_UPSTREAM: 'https://example.com' } });
  assert.equal((await f.call()).status, 503); assert.equal(f.received.length, 0);
});
test('finance proxy refuses paths outside its prefix', async t => {
  const f = await fixture(t); assert.equal((await f.call('/private')).status, 404); assert.equal(f.received.length, 0);
});
test('websocket upgrade requires both admin session and same origin', async t => {
  const f = await fixture(t);
  assert.equal((await f.upgrade({ cookie: '' })).status, 401);
  assert.equal((await f.upgrade({ origin: 'https://evil.example' })).status, 401);
  assert.equal((await f.upgrade({ origin: '' })).status, 401);
  assert.equal(f.received.length, 0);
});
test('an authenticated websocket relays data and closes on logout revocation', async t => {
  const f = await fixture(t); const connection = await f.upgrade(); assert.equal(connection.status, 101);
  const echoed = new Promise(resolve => connection.socket.once('data', data => resolve(data.toString())));
  connection.socket.write('fixture frame'); assert.equal(await echoed, 'fixture frame');
  const closed = new Promise(resolve => connection.socket.once('close', resolve));
  f.sessions.delete(f.id); f.proxy.revoke(f.id); await closed;
  assert.equal((await f.call()).status, 403);
});
test('websocket closes when its session expires', async t => {
  const f = await fixture(t); f.sessions.get(f.id).expires = Date.now() + 120;
  const connection = await f.upgrade(); assert.equal(connection.status, 101);
  await new Promise(resolve => connection.socket.once('close', resolve));
  assert.equal((await f.call()).status, 403);
});
test('logout during upstream handshake cannot create a live socket', async t => {
  const f = await fixture(t, { beforeUpgrade: (sessions, id) => sessions.delete(id) });
  assert.equal((await f.upgrade()).status, 401);
});
