# Codeflow Studios hosting handoff

The public website and `/nightly-build-club` can run without GPT hosting. Keep
`https://www.codeflowstudios.dev` as the canonical origin during the move.

## Recommended: Docker

```sh
docker build -t codeflow-studios .
docker run --rm -p 3000:3000 --env-file .env.production codeflow-studios
```

The container listens on port `3000`. Configure the hosting platform to send
traffic to that port and to restart the container automatically.

## Standard Node hosting

Use Node.js 22.13 or newer and pnpm 11.19.0.

```sh
pnpm install --frozen-lockfile
node node_modules/next/dist/bin/next build
PORT=3000 node node_modules/next/dist/bin/next start -H 0.0.0.0
```

## Environment variables

- `NEXT_PUBLIC_NIGHTLY_DISCORD_URL`: optional permanent Discord invite URL. If
  omitted, the community page uses an email request instead of a broken link.
- `MARKETING_API_URL`: required only for the separate marketing dashboard/API
  proxy. The public company and community pages do not need it.

Never commit passwords, tokens or production `.env` files.

## Migration order

1. Deploy the GitHub `main` branch to the new host.
2. Verify `/`, `/nightly-build-club`, `/robots.txt`, `/sitemap.xml` and `/skumic`.
3. Add `NEXT_PUBLIC_NIGHTLY_DISCORD_URL` when the permanent invite is ready.
4. Add the custom domain to the new host and wait for HTTPS to become active.
5. Change only the required DNS records; keep the previous host available while
   DNS propagates.
6. Test both `codeflowstudios.dev` and `www.codeflowstudios.dev`, then redirect
   the non-primary hostname to `https://www.codeflowstudios.dev`.
7. Remove the old GPT deployment only after the new host passes the checks.

## Smoke checks

- Dutch and English switching works on the homepage and community page.
- Community navigation works on desktop and from the homepage on mobile.
- Discord falls back to email when no invite URL is configured.
- The Shopify button opens `https://dp1r61-j0.myshopify.com`.
- Keyboard focus, mobile layout and 200% text zoom remain usable.
