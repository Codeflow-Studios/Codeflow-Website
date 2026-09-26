# Flow Community setup

Flow Community combines durable web content with live Discord interaction.

## Current website foundation

- Public route: `/flow-community/`
- Previous route: `/nightly-build-club/` redirects to Flow Community
- Shop: `https://shop.codeflowstudios.be`
- Discord link variable: `NEXT_PUBLIC_FLOW_DISCORD_URL`
- Temporary fallback: an email request if no Discord invite is configured

## Flow Shop domain activation

1. At the DNS provider for `codeflowstudios.be`, create a `CNAME` record with host `shop` and target `shops.myshopify.com`.
2. In Shopify, open **Settings > Domains > Connect existing domain**.
3. Enter `shop.codeflowstudios.be`, complete verification and set it as the shop's primary domain when Shopify confirms SSL is ready.
4. Keep the main `codeflowstudios.be` website records unchanged.

## Discord setup checklist

1. Enable **Community** in Discord server settings.
2. Create onboarding choices for Builder, Reviewer and Connector.
3. Add Forum Channels for build logs, project reviews and collaboration.
4. Configure Server Guide with rules and three first actions.
5. Use Scheduled Events for confirmed Build Nights.
6. Add a Discord application later for a `/build` command and website sign-in.

Never commit Discord bot tokens, client secrets or private invite-management credentials. A real forum login, Discord account connection and cross-posting require a backend runtime; keep that separate from the static SiteGround website.
