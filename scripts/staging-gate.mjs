import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';

const cookieName = 'codeflow_staging';
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;
const loginPath = '/__staging/login';
const failedAttempts = new Map();

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function safeDestination(value) {
  return typeof value === 'string' && value.startsWith('/')
    && !value.startsWith('//') && !/[\\\r\n]/.test(value) ? value : '/';
}

function loginPage(next, error = '') {
  const destination = escapeHtml(safeDestination(next));
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Testomgeving · Codeflow Studios</title>
<style>
  :root{color-scheme:dark;font-family:Arial,Helvetica,sans-serif;background:#111115;color:#f4f1ed}
  *{box-sizing:border-box}body{min-height:100vh;margin:0;display:grid;place-items:center;padding:24px}
  main{width:min(100%,440px);border:1px solid #35353d;border-radius:14px;padding:clamp(24px,6vw,40px);background:#1b1b21}
  .brand{font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:.8rem;color:#ff713d}
  h1{font-size:clamp(2rem,7vw,3rem);line-height:1.05;margin:30px 0 16px}
  p{color:#b9b9c1;line-height:1.55}label{display:block;margin:28px 0 9px;font-weight:700}
  input{width:100%;min-height:48px;padding:12px;border:1px solid #6b6b73;border-radius:7px;background:#111115;color:#fff;font:inherit}
  input:focus{outline:2px solid #ff713d;outline-offset:2px}button{width:100%;min-height:48px;margin-top:14px;border:0;border-radius:7px;background:#ff713d;color:#111115;font:700 1rem Arial;cursor:pointer}
  .error{color:#ffaaa0}small{display:block;margin-top:26px;color:#8d8d98}
</style></head><body><main><div class="brand">Codeflow Studios</div>
<h1>Testomgeving</h1><p>Deze afgeschermde website is een testomgeving van Codeflow Studios.</p>
${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ''}
<form method="post" action="${loginPath}"><input type="hidden" name="next" value="${destination}">
<label for="password">Wachtwoord</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Open testomgeving</button></form><small>Alleen voor toegang tot de preview.</small></main></body></html>`;
}

function sendLogin(response, next, status = 200, error = '') {
  response.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow',
  });
  response.end(loginPage(next, error));
}

function readForm(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 8192) request.destroy();
    });
    request.on('end', () => resolve(new URLSearchParams(body)));
    request.on('error', reject);
  });
}

export function startStagingGate({ password, port, upstreamPort }) {
  if (!password) throw new Error('STAGING_PASSWORD must be set for the staging gate.');
  const passwordHash = createHash('sha256').update(password).digest();
  const signingKey = scryptSync(password, 'codeflow-staging-v1', 32);

  function authenticated(request) {
    const raw = request.headers.cookie?.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!raw) return false;
    const [version, expiration, nonce, signature] = raw.split('.');
    if (version !== 'v1' || !/^\d+$/.test(expiration || '') || !/^[0-9a-f]{32}$/.test(nonce || '')
      || !/^[0-9a-f]{64}$/.test(signature || '') || Number(expiration) < Date.now()) return false;
    const expected = createHmac('sha256', signingKey).update(`${version}.${expiration}.${nonce}`).digest();
    return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
  }

  function forward(request, response) {
    const upstream = httpRequest({
      hostname: '127.0.0.1', port: upstreamPort, path: request.url, method: request.method,
      headers: { ...request.headers, host: request.headers.host },
    }, (result) => {
      response.writeHead(result.statusCode || 502, {
        ...result.headers,
        'x-robots-tag': 'noindex, nofollow',
      });
      result.pipe(response);
    });
    upstream.on('error', () => {
      if (!response.headersSent) response.writeHead(503, { 'content-type': 'text/plain', 'retry-after': '3' });
      response.end('Testomgeving start op. Probeer het opnieuw.');
    });
    request.pipe(upstream);
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    // The public .be website embeds only these static game files from Railway.
    if ((request.method === 'GET' || request.method === 'HEAD')
      && (url.pathname === '/skumic-game' || url.pathname.startsWith('/skumic-game/'))) {
      forward(request, response);
      return;
    }
    if (url.pathname === loginPath) {
      if (request.method === 'GET') {
        const next = safeDestination(url.searchParams.get('next'));
        if (authenticated(request)) {
          response.writeHead(303, { location: next, 'cache-control': 'no-store' });
          response.end();
        } else sendLogin(response, next);
        return;
      }
      if (request.method === 'POST') {
        try {
          const form = await readForm(request);
          const next = safeDestination(form.get('next'));
          const candidateHash = createHash('sha256').update(form.get('password') || '').digest();
          const client = request.socket.remoteAddress || 'unknown';
          const record = failedAttempts.get(client);
          const attempts = record && record.until > Date.now() ? record.count : 0;
          if (!timingSafeEqual(passwordHash, candidateHash)) {
            if (attempts >= 10) {
              sendLogin(response, next, 429, 'Te veel pogingen. Probeer het later opnieuw.');
              return;
            }
            failedAttempts.set(client, { count: attempts + 1, until: Date.now() + 15 * 60 * 1000 });
            sendLogin(response, next, 401, 'Wachtwoord klopt niet.');
            return;
          }
          failedAttempts.delete(client);
          const expiration = Date.now() + sessionLifetimeSeconds * 1000;
          const nonce = randomBytes(16).toString('hex');
          const data = `v1.${expiration}.${nonce}`;
          const signature = createHmac('sha256', signingKey).update(data).digest('hex');
          response.writeHead(303, {
            location: next,
            'cache-control': 'no-store',
            'set-cookie': `${cookieName}=${data}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${sessionLifetimeSeconds}`,
          });
          response.end();
        } catch {
          if (!response.headersSent) response.writeHead(400);
          response.end();
        }
        return;
      }
      response.writeHead(405, { allow: 'GET, POST' });
      response.end();
      return;
    }
    if (!authenticated(request)) {
      if (request.method === 'GET' || request.method === 'HEAD') {
        response.writeHead(302, { location: `${loginPath}?next=${encodeURIComponent(safeDestination(request.url))}`, 'cache-control': 'no-store' });
      } else {
        response.writeHead(401, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      }
      response.end();
      return;
    }
    forward(request, response);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve(server));
  });
}
