# Codeflow admin

`pnpm start` exposes `/admin` through the Node server on `PORT`, before forwarding
public traffic to the existing worker. The worker listens only on loopback
(`WORKER_INTERNAL_PORT`, default 8788). Optional staging protection uses its own
internal port (`STAGING_INTERNAL_PORT`, default 8789). Use the start script rather
than exposing Wrangler directly. `/admin` has no public framework page or static
dashboard artifact.

The SiteGround `.htaccess` redirects `.be/admin` to the existing Railway website
service. Deploy Railway before SiteGround after merging. No public nav or sitemap
entry is added. All admin responses have `noindex, nofollow` and `no-store`.

## Railway configuration

Set these **service-level** variables on project `Skumic`, production environment
`eee2223f-5047-46ae-892e-76d3a29799cd`, website service
`f736fbd3-12ac-43ab-89ef-d2b49d0b0ff0` (source `Codeflow-Studios/Codeflow-Website`).
Do not put them on Marketing AI or What’s Next, or in Git.

| Variable | Value |
| --- | --- |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD_HASH` | `scrypt$<32 hex salt>$<128 hex derived key>`; N=32768, r=8, p=1, 64 bytes |
| `ADMIN_SESSION_SECRET` | A random secret of at least 32 characters |
| `ADMIN_ORIGIN` | `https://codeflow-studios-production.up.railway.app` (no trailing slash) |

`scripts/admin-secrets.mjs` accepts a JSON password object through stdin and emits
the configuration for direct consumption by a secrets tool. Never print or save
its result, use a plaintext env example, pass a password as a command argument,
or place it in shell history. Seal secrets in Railway if that UI option is available.
Missing or malformed configuration yields HTTP 503, without any dashboard data.

## Security and scaling

Passwords use asynchronous scrypt; comparisons use constant-time byte comparison.
Login/logout require the configured HTTPS Origin and a CSRF token. Sessions use
256-bit random opaque identifiers held in server memory, with Secure, HttpOnly,
SameSite=Strict, host-only cookies. Sessions expire after eight hours, are rotated
on login and revoked on logout. Restarting the server revokes all sessions.

The global budget permits ten login attempts per fifteen minutes, and serializes
password derivation. Forwarded IP headers cannot evade the limit. This intentionally
conservative budget can temporarily block the administrator after repeated attempts.
The current Railway service has **one replica**. Before adding replicas, replace the
memory session store and rate limit with shared storage such as Redis. Do not deploy
multiple replicas with independent in-memory state.

## Content and checks

The reviewed route directory in `scripts/admin-content.mjs` includes actual
`app/**/page.tsx` and `public/**/index.html` destinations. The directory is protected;
linked public pages retain their existing permissions. Adding a link does not make
its destination private. Its route-existence test catches deleted destinations.

What’s Next and Railway project/service links were discovered through the connector.
Mail links include both `https://www.codeflowstudios.be/webmail` and Proton Mail.
No website visitor analytics source was found in the repository. The dashboard
labels the empty statistics and describes connecting a source; resource metrics
are not presented as unique visitors.

Run `node --test scripts/admin-server.test.mjs`, `pnpm exec tsc --noEmit`,
`pnpm build`, and `pnpm build:siteground`. Verify login/logout with HTTPS in a browser
at mobile and desktop sizes. After release, verify `.be/admin` redirects to Railway,
unauthenticated access contains no dashboard links, and cookie flags remain intact.
