import { createServer, request as httpRequest } from 'node:http';
import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { css, dashboard, loginPage, page } from './admin-content.mjs';

const derive = promisify(scrypt);
const cookieName = '__Host-codeflow_admin';
const loginCookie = '__Host-codeflow_login';
const lifetime = 8 * 60 * 60 * 1000;
const windowMs = 15 * 60 * 1000;
const equal = (a, b) => typeof a === 'string' && typeof b === 'string'
  && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const cookie = (name, value, seconds) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;
const readCookie = (req, name) => req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function readForm(req) {
  if (!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) throw new Error('form');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4096) throw new Error('size');
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
}

export function createAdminServer({ upstreamPort, env = process.env, now = Date.now }) {
  const sessions = new Map();
  // Single administrator / one Railway replica: a global budget cannot be
  // bypassed by spoofing X-Forwarded-For. Move to a shared store before scaling.
  let budget = { count: 0, until: 0 }; let verifying = false;
  const hash = env.ADMIN_PASSWORD_HASH || '';
  const match = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(hash);
  let origin;
  try { const parsed = new URL(env.ADMIN_ORIGIN); if (parsed.protocol === 'https:' && parsed.origin === env.ADMIN_ORIGIN) origin = parsed.origin; } catch { /* fail closed */ }
  const ready = Boolean(match && origin && env.ADMIN_USERNAME && env.ADMIN_SESSION_SECRET?.length >= 32);
  const sign = value => createHmac('sha256', env.ADMIN_SESSION_SECRET).update(value).digest('hex');
  const csrfToken = () => { const value = `${now() + windowMs}.${randomBytes(24).toString('hex')}`; return `${value}.${sign(value)}`; };
  const validCsrf = (token) => {
    if (typeof token !== 'string' || token.length > 160) return false;
    const [expiry, nonce, signature] = token.split('.');
    return /^\d+$/.test(expiry || '') && Number(expiry) > now() && Number(expiry) <= now() + windowMs
      && /^[a-f0-9]{48}$/.test(nonce || '') && equal(signature, sign(`${expiry}.${nonce}`));
  };
  return createServer(async (req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\\/g, '/'); } catch { res.writeHead(400).end(); return; }
    if (pathname !== '/admin' && !pathname.startsWith('/admin/')) {
      const proxy = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: req.headers }, result => {
        res.writeHead(result.statusCode || 502, result.headers); result.pipe(res);
      });
      proxy.on('error', () => { if (!res.headersSent) res.writeHead(503); res.end('Website start op. Probeer opnieuw.'); });
      req.pipe(proxy); return;
    }
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    const send = (status, body, type = 'text/html; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type }); res.end(req.method === 'HEAD' ? undefined : body); };
    const redirect = location => { res.writeHead(303, { Location: location }); res.end(); };
    if (pathname === '/admin/style.css' && ['GET','HEAD'].includes(req.method)) { send(200, css, 'text/css; charset=utf-8'); return; }
    if (!ready) { send(503, page('<main><h1>Admin nog niet beschikbaar.</h1><p>De beveiligde toegang moet nog worden geconfigureerd.</p></main>')); return; }
    const canonical = new URL(origin);
    if (req.headers.host !== canonical.host) { send(400, 'Ongeldige host.'); return; }
    for (const [id, session] of sessions) if (session.expires <= now()) sessions.delete(id);
    const sessionId = readCookie(req, cookieName);
    const session = sessionId && sessions.get(sessionId);
    const showLogin = (status = 200, error = '') => { const token = csrfToken(); res.setHeader('Set-Cookie', cookie(loginCookie, token, 900)); send(status, loginPage(token, error)); };
    if (['GET','HEAD'].includes(req.method)) {
      if (pathname === '/admin/login') { if (session) redirect('/admin'); else showLogin(); return; }
      if (!session) { redirect('/admin/login'); return; }
      if (pathname === '/admin' || pathname === '/admin/') send(200, dashboard(session.csrf));
      else send(404, 'Niet gevonden.');
      return;
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, HEAD, POST'); send(405, 'Methode niet toegestaan.'); return; }
    if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') { send(403, 'Ongeldige aanvraag.'); return; }
    try {
      const form = await readForm(req);
      if (pathname === '/admin/logout') {
        if (!session || !equal(form.get('csrf'), session.csrf)) { send(403, 'Ongeldige aanvraag.'); return; }
        sessions.delete(sessionId); res.setHeader('Set-Cookie', cookie(cookieName, '', 0)); redirect('/admin/login'); return;
      }
      if (pathname !== '/admin/login') { send(404, 'Niet gevonden.'); return; }
      if (!validCsrf(form.get('csrf')) || !equal(form.get('csrf'), readCookie(req, loginCookie))) { send(403, 'Ververs de loginpagina en probeer opnieuw.'); return; }
      if (budget.until <= now()) budget = { count: 0, until: now() + windowMs };
      if (budget.count >= 10 || verifying) { res.setHeader('Retry-After', String(Math.max(1, Math.ceil((budget.until - now()) / 1000)))); showLogin(429, 'Te veel pogingen. Probeer het over 15 minuten opnieuw.'); return; }
      budget.count++;
      const password = form.get('password') || '';
      if (password.length > 512) { showLogin(401, 'Gebruikersnaam of wachtwoord klopt niet.'); return; }
      verifying = true;
      let candidate;
      try { candidate = await derive(password, match[1], 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }); } finally { verifying = false; }
      if (!timingSafeEqual(candidate, Buffer.from(match[2], 'hex')) || !equal(form.get('username'), env.ADMIN_USERNAME)) { showLogin(401, 'Gebruikersnaam of wachtwoord klopt niet.'); return; }
      // Rotate on login and cap state. Logout invalidates the server-side record.
      if (sessionId) sessions.delete(sessionId);
      if (sessions.size >= 20) sessions.delete(sessions.keys().next().value);
      const id = randomBytes(32).toString('hex');
      sessions.set(id, { expires: now() + lifetime, csrf: randomBytes(32).toString('hex') });
      res.setHeader('Set-Cookie', [cookie(cookieName, id, lifetime / 1000), cookie(loginCookie, '', 0)]);
      redirect('/admin');
    } catch { if (!res.headersSent) send(400, 'Ongeldige aanvraag.'); }
  });
}
