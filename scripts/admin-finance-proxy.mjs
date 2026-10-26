import { request } from 'node:http';

const prefix = '/admin/finance';
export const isFinancePath = path => path === prefix || path.startsWith(prefix + '/');
const sessionCookie = req => req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('__Host-codeflow_admin='))?.slice('__Host-codeflow_admin='.length);

export function createFinanceProxy({ env, sessions, now = Date.now }) {
  let upstream, origin;
  try {
    const target = new URL(env.FLOWFINANCE_UPSTREAM);
    const host = target.hostname.toLowerCase();
    if (target.protocol === 'http:' && !target.username && !target.password && target.pathname === '/' && !target.search && !target.hash &&
        (host.endsWith('.railway.internal') || ['127.0.0.1', 'localhost', '[::1]'].includes(host))) upstream = target;
  } catch { /* Missing configuration stays closed. */ }
  try { const canonical = new URL(env.ADMIN_ORIGIN); if (canonical.protocol === 'https:' && canonical.origin === env.ADMIN_ORIGIN) origin = canonical; } catch { /* Invalid origin stays closed. */ }
  const key = env.FLOWFINANCE_GATEWAY_KEY;
  const ready = Boolean(upstream && origin && typeof key === 'string' && key.length >= 32 && key.length <= 256 && !/[\x00-\x1f\x7f]/.test(key));
  const live = new Map();
  const authorized = (req, upgrade = false) => {
    const id = sessionCookie(req);
    const session = id && sessions.get(id);
    if (!origin || req.headers.host !== origin.host || !session || session.expires <= now()) return null;
    if (req.headers['sec-fetch-site'] === 'cross-site') return null;
    const suppliedOrigin = req.headers.origin;
    if ((upgrade || !['GET', 'HEAD'].includes(req.method)) && suppliedOrigin !== origin.origin) return null;
    if (suppliedOrigin && suppliedOrigin !== origin.origin) return null;
    return { id, session };
  };
  const headers = req => {
    const result = { ...req.headers };
    for (const name of Object.keys(result)) {
      if (name === 'forwarded' || name.startsWith('x-forwarded-') || ['authorization', 'proxy-authorization', 'x-codeflow-finance-key', 'host'].includes(name)) delete result[name];
    }
    if (result.cookie) {
      result.cookie = result.cookie.split(';').filter(c => !/^\s*__Host-codeflow_(admin|login)=/.test(c)).join(';');
      if (!result.cookie) delete result.cookie;
    }
    result.host = upstream.host;
    result['x-codeflow-finance-key'] = key;
    result['x-forwarded-proto'] = 'https';
    result['x-forwarded-host'] = origin.host;
    return result;
  };
  const revoke = id => {
    for (const connection of live.get(id) || []) { clearTimeout(connection.timer); connection.client.destroy(); connection.upstream.destroy(); }
    live.delete(id);
  };
  const close = () => { for (const id of [...live.keys()]) revoke(id); };
  const denySocket = (socket, status = 401) => socket.end(`HTTP/1.1 ${status} ${status === 401 ? 'Unauthorized' : 'Unavailable'}\r\nConnection: close\r\nCache-Control: no-store\r\nContent-Length: 0\r\n\r\n`);

  return {
    revoke, close,
    handle(req, res) {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\\/g, '/'); } catch { res.writeHead(400).end(); return; }
      if (!isFinancePath(pathname)) { res.writeHead(404).end(); return; }
      if (!authorized(req)) { res.writeHead(403).end('Ongeldige aanvraag.'); return; }
      if (!ready) { res.writeHead(503).end('Financiën is nog niet gekoppeld.'); return; }
      const proxy = request({ hostname: upstream.hostname.replace(/^\[|\]$/g, ''), port: upstream.port || 80, method: req.method, path: req.url, headers: headers(req) }, response => {
        res.writeHead(response.statusCode || 502, response.headers); response.pipe(res);
      });
      proxy.setTimeout(120000, () => proxy.destroy());
      proxy.on('error', () => { if (!res.headersSent) res.writeHead(503).end('Financiën is tijdelijk niet beschikbaar.'); else res.destroy(); });
      req.on('aborted', () => proxy.destroy());
      res.on('close', () => proxy.destroy());
      req.pipe(proxy);
    },
    upgrade(req, socket, head) {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\\/g, '/'); } catch { denySocket(socket, 400); return; }
      if (!isFinancePath(pathname)) { denySocket(socket, 404); return; }
      const auth = authorized(req, true);
      if (!auth) { denySocket(socket); return; }
      if (!ready) { denySocket(socket, 503); return; }
      socket.on('error', () => socket.destroy());
      const proxy = request({ hostname: upstream.hostname.replace(/^\[|\]$/g, ''), port: upstream.port || 80, method: 'GET', path: req.url, headers: headers(req) });
      proxy.setTimeout(15000, () => proxy.destroy());
      proxy.on('upgrade', (response, upstreamSocket, upstreamHead) => {
        // Login may have expired or been revoked while the upstream was connecting.
        if (!authorized(req, true)) { upstreamSocket.destroy(); denySocket(socket); return; }
        proxy.setTimeout(0); upstreamSocket.setTimeout(0);
        let responseHeaders = 'HTTP/1.1 101 Switching Protocols\r\n';
        for (let i = 0; i < response.rawHeaders.length; i += 2) responseHeaders += response.rawHeaders[i] + ': ' + response.rawHeaders[i + 1] + '\r\n';
        socket.write(responseHeaders + 'Cache-Control: no-store\r\n\r\n');
        const connection = { client: socket, upstream: upstreamSocket, timer: null };
        if (!live.has(auth.id)) live.set(auth.id, new Set());
        live.get(auth.id).add(connection);
        const cleanup = () => { clearTimeout(connection.timer); live.get(auth.id)?.delete(connection); if (live.get(auth.id)?.size === 0) live.delete(auth.id); };
        connection.timer = setTimeout(() => { socket.destroy(); upstreamSocket.destroy(); cleanup(); }, Math.max(1, auth.session.expires - now()));
        connection.timer.unref();
        socket.on('close', () => { upstreamSocket.destroy(); cleanup(); });
        upstreamSocket.on('close', () => { socket.destroy(); cleanup(); });
        upstreamSocket.on('error', () => socket.destroy());
        if (head.length) upstreamSocket.write(head);
        if (upstreamHead.length) socket.write(upstreamHead);
        socket.pipe(upstreamSocket); upstreamSocket.pipe(socket);
      });
      proxy.on('response', response => { response.resume(); denySocket(socket, response.statusCode === 403 ? 403 : 502); });
      proxy.on('error', () => { if (!socket.destroyed) denySocket(socket, 503); });
      socket.on('close', () => proxy.destroy());
      proxy.end();
    }
  };
}
