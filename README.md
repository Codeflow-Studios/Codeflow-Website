# Codeflow Studios

Bilingual Dutch/English website for Codeflow Studios CommV in Bruges, Belgium. The marketing offer centres on real-time trend relevance. Marketing, graphic design and software development are separate services, each with their own packages. Rebranding combines all three, with its own complete packages. Web design sits within graphic design; website implementation sits within software development.

## Run locally

Node.js 22.13 or newer is required. Use the pnpm version in package.json.

```sh
corepack enable
pnpm install
pnpm dev
```

The application uses React and Vinext. The normal local development URL is printed by the development command. `pnpm build` produces Cloudflare Worker-compatible output; the managed Sites environment uses the included verified build pipeline.

## Implemented

- Responsive marketing website using the supplied original logo.
- Dutch / English language toggle and translated intake.
- Four bilingual package categories: marketing, graphic design, software development and rebranding.
- Three concept tiers per category, all with price placeholders.
- Marketing packages open the existing intake; project packages open a prefilled email for discussing scope.
- Five-step company onboarding at `/onboarding?plan=flow&lang=en`.
- Input validation, backwards editing, review and JSON brief download.
- Email, telephone, WhatsApp, Facebook and Instagram contact links.
- Page-local WebMCP read tool, feature-detected when supported.

## Preview boundaries

This version is a website and working onboarding preview. It does not create an account, charge a subscription, ingest live trends, generate an AI strategy, publish content or send the questionnaire to a server. Questionnaire answers live only in React page memory and are cleared on reload. Only the display language is stored locally. The download contains the user's validated answers and explicitly marks the subscription as inactive.

## Launch integrations still required

1. Confirm real package scope, prices and subscription terms.
2. Connect authentication, billing and a verified checkout-completion handoff to onboarding. Verify subscriptions server-side; a query parameter must never grant paid access.
3. Add tenant-isolated storage and persist intake responses against an authenticated organisation.
4. Connect licensed trend sources and an AI provider. Check relevance by industry, audience and market; honour excluded subjects and brand constraints.
5. Connect channels with explicit client authorisation and define publication controls and performance feedback.
6. Add verified business/registration information and the actual data-processing and privacy details before public launch.
7. Connect the chosen primary domain (`codeflowstudios.be`) and redirect the other supplied domains after domain ownership and DNS are available.

## Assets

- `public/codeflow-logo.png`: original logo supplied by the owner.
- `public/brand-flow.webp`: generated chrome ribbon with orange, red and pink accents, created for this website.

## Source control

The code is saved in the existing Sites source repository. A new GitHub repository has not yet been created: the currently connected GitHub toolset does not expose repository creation. The source can be pushed once an empty destination repository is supplied.


## Codeflow Tower showcase

The supplied `Codeflow-Tower.zip` contains the Codeflow Tower 0.2 Windows x64 game, its Godot 4 C# source, documentation and screenshots. There is no HTML/JavaScript/WebAssembly export in the archive. The executable is not a web-compatible asset and is not served as one.

The homepage at `#game` now uses the real game title, its Studio and Review screenshots, and verified information from the supplied README: three floors, six colleague tasks, turn-based manager reviews, original code-drawn pixel art and synthesized music. The images are explicitly captioned as screenshots of the Windows game. A browser play button remains unavailable, and the site clearly labels the Windows-only status.

The original archive and source have not been modified. Screenshot assets are converted to WebP for the website. The source remains in the uploaded ZIP; only the two selected screenshots are included in the Site.

Godot's current stable documentation states that Godot 4 C# projects cannot be exported to the web: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html

Direct browser play therefore requires a separately implemented and verified browser port, not simply renaming or uploading the Windows executable. Set `gameConfig.url` in `components/codeflow/game-showcase.tsx` only after that build exists and its hosting requirements have been checked. The existing player supports explicit launch, stop, restart and fullscreen.
