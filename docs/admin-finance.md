# Personal finance behind admin

The finance application remains C# / Blazor / SQLite in the private repository `Codeflow-Studios/Flow-Finance`. This website only supplies the existing admin session and a private HTTP/WebSocket proxy at `/admin/finance`.

## Runtime configuration

Deploy the finance repository as a separate Railway service with one replica, no public domain, and a persistent volume mounted at `/data`. Its Dockerfile enables hosted mode. Set `FLOWFINANCE_PUBLIC_ORIGIN` to the exact existing `ADMIN_ORIGIN`, and generate one new server-only `FLOWFINANCE_GATEWAY_KEY` (32–256 random characters).

On this existing website service, add:

| Variable | Value |
| --- | --- |
| `FLOWFINANCE_UPSTREAM` | `http://<actual-finance-service>.railway.internal:8080` |
| `FLOWFINANCE_GATEWAY_KEY` | Same server-only key as the finance service |

Existing admin username, password hash, session secret and canonical origin do not change. Never commit these values. The finance service must be healthy before deploying the gateway integration; the SiteGround redirect is deployed last.

The normal SiteGround workflow waits until the gateway serves the matching Git commit in `X-Codeflow-Admin-Revision` and redirects anonymous finance requests to login. This prevents publishing the new redirect before its protected gateway is available. Existing dry-run and SiteGround-only rollback behavior is preserved.

## Access guarantees

- Every finance page, asset and negotiation request is behind the normal admin session.
- Websocket upgrades require a valid session, canonical Host and exact same Origin.
- Login rotation, logout, expiration and session eviction revoke live finance sockets.
- Browser-supplied gateway/forwarding/authorization headers and admin cookies are stripped before proxying. Only the gateway inserts the private upstream key.
- Private data is not placed in the public website build. No finance link is added to public navigation or sitemap.
- Missing or invalid configuration stays closed with 503 after authentication. Anonymous users see the normal login redirect.
- The existing SiteGround `/admin/*` redirect preserves subpaths, including `/admin/finance`.

## Checks

```text
node --test scripts/admin-server.test.mjs scripts/admin-finance-proxy.test.mjs
```

The finance repository separately checks .NET calculations, storage, hosted configuration, all pages under the prefix, protected static files, negotiation and a real Blazor websocket upgrade. The canonical gateway adapter and its tests are included there under `deployment/gateway`.

No deployment is implied by this file. Confirm the target domain, actual service IDs, persistent volume, environment variables, successful deployments and live anonymous/login behavior before calling the integration online.
