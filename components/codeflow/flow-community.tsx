'use client';

import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Hash,
  MessageCircle,
  MessagesSquare,
  Radio,
  Rocket,
  Search,
  Sparkles,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import { Footer, Header, email, shopUrl, useLanguage } from './shared';
import type { Language } from './shared';

type SpaceKey = 'builds' | 'feedback' | 'ideas' | 'live';
type JourneyKey = 'build' | 'feedback' | 'collaborate';

export default function FlowCommunity({
  initialLang = 'nl',
}: {
  initialLang?: Language;
}) {
  const { lang, setLang, en } = useLanguage(initialLang);
  const [activeSpace, setActiveSpace] = useState<SpaceKey>('builds');
  const [activeJourney, setActiveJourney] = useState<JourneyKey>('build');

  const configuredDiscordUrl = (
    process.env.NEXT_PUBLIC_FLOW_DISCORD_URL
    || process.env.NEXT_PUBLIC_NIGHTLY_DISCORD_URL
    || ''
  ).trim();
  const emailInviteRequest = `mailto:${email}?subject=${encodeURIComponent(
    'Flow Community — Discord invite',
  )}`;
  const discordInviteHref = configuredDiscordUrl || emailInviteRequest;
  const discordActionLabel = configuredDiscordUrl
    ? (en ? 'Open Discord' : 'Open Discord')
    : (en ? 'Request an invite' : 'Vraag een uitnodiging');

  const journeys = en
    ? [
        {
          key: 'build' as const,
          label: 'I want to build',
          role: 'Builder',
          channel: '#build-room',
          action: 'Start a focused build log and define one finish line.',
        },
        {
          key: 'feedback' as const,
          label: 'I need feedback',
          role: 'Reviewer',
          channel: 'Project Reviews',
          action: 'Share context, screenshots and one clear question.',
        },
        {
          key: 'collaborate' as const,
          label: 'I want to collaborate',
          role: 'Connector',
          channel: '#collaboration',
          action: 'Say what you offer, what you need and what success looks like.',
        },
      ]
    : [
        {
          key: 'build' as const,
          label: 'Ik wil bouwen',
          role: 'Builder',
          channel: '#build-room',
          action: 'Start een gerichte buildlog en bepaal één duidelijke finishlijn.',
        },
        {
          key: 'feedback' as const,
          label: 'Ik wil feedback',
          role: 'Reviewer',
          channel: 'Project Reviews',
          action: 'Deel context, screenshots en één concrete vraag.',
        },
        {
          key: 'collaborate' as const,
          label: 'Ik zoek samenwerking',
          role: 'Connector',
          channel: '#collaboration',
          action: 'Vertel wat je aanbiedt, wat je zoekt en wanneer de samenwerking geslaagd is.',
        },
      ];

  const spaces = en
    ? [
        {
          key: 'builds' as const,
          label: 'Build logs',
          type: 'WEB FORUM',
          title: 'Turn progress into a visible story.',
          description: 'Document what you are making, where it is stuck and what you shipped. Useful updates stay searchable instead of disappearing in a chat feed.',
          tags: ['Work in progress', 'Shipped', 'Blocked'],
          prompts: ['What is the smallest result you can show?', 'What changed since your last session?', 'What is the next decision?'],
          Icon: Rocket,
        },
        {
          key: 'feedback' as const,
          label: 'Project reviews',
          type: 'WEB FORUM',
          title: 'Ask one clear question. Get useful feedback.',
          description: 'Structured reviews for code, product, brand and marketing work—with context, screenshots and a defined feedback request.',
          tags: ['Code', 'Design', 'Marketing'],
          prompts: ['What are you trying to achieve?', 'What have you already tried?', 'Which decision needs feedback?'],
          Icon: MessagesSquare,
        },
        {
          key: 'ideas' as const,
          label: 'Ideas & collaboration',
          type: 'WEB FORUM',
          title: 'Pressure-test ideas before overbuilding them.',
          description: 'A place for early concepts, scope checks and collaboration calls. The goal is a sharper next step, not empty hype.',
          tags: ['Validate', 'Scope', 'Collaborate'],
          prompts: ['Who is this for?', 'Which problem is real?', 'What can be tested this week?'],
          Icon: Sparkles,
        },
        {
          key: 'live' as const,
          label: 'Build Nights',
          type: 'DISCORD LIVE',
          title: 'Build together without turning it into another meeting.',
          description: 'Voice coworking, quick questions and scheduled build sessions. Dates are announced only after they are confirmed.',
          tags: ['Coworking', 'Voice', 'Events'],
          prompts: ['Choose one outcome', 'Work in a focused block', 'Share proof at the end'],
          Icon: Radio,
        },
      ]
    : [
        {
          key: 'builds' as const,
          label: 'Buildlogs',
          type: 'WEBFORUM',
          title: 'Maak van vooruitgang een zichtbaar verhaal.',
          description: 'Documenteer wat je bouwt, waar je vastzit en wat je hebt uitgebracht. Nuttige updates blijven vindbaar in plaats van te verdwijnen in een chatfeed.',
          tags: ['In opbouw', 'Uitgebracht', 'Geblokkeerd'],
          prompts: ['Wat is het kleinste resultaat dat je kunt tonen?', 'Wat veranderde sinds je vorige sessie?', 'Wat is de volgende beslissing?'],
          Icon: Rocket,
        },
        {
          key: 'feedback' as const,
          label: 'Projectreviews',
          type: 'WEBFORUM',
          title: 'Stel één heldere vraag. Krijg bruikbare feedback.',
          description: 'Gestructureerde reviews voor code, product, merk en marketing—met context, screenshots en een concrete feedbackvraag.',
          tags: ['Code', 'Design', 'Marketing'],
          prompts: ['Wat wil je bereiken?', 'Wat heb je al geprobeerd?', 'Welke beslissing heeft feedback nodig?'],
          Icon: MessagesSquare,
        },
        {
          key: 'ideas' as const,
          label: 'Ideeën & samenwerking',
          type: 'WEBFORUM',
          title: 'Test ideeën voordat je ze te groot bouwt.',
          description: 'Een plek voor vroege concepten, scopechecks en samenwerkingsvragen. Het doel is een scherpere volgende stap, geen lege hype.',
          tags: ['Valideren', 'Scope', 'Samenwerken'],
          prompts: ['Voor wie is dit?', 'Welk probleem is echt?', 'Wat kun je deze week testen?'],
          Icon: Sparkles,
        },
        {
          key: 'live' as const,
          label: 'Build Nights',
          type: 'DISCORD LIVE',
          title: 'Bouw samen zonder er nog een vergadering van te maken.',
          description: 'Voice-coworking, snelle vragen en geplande buildsessies. Datums worden pas gedeeld wanneer ze bevestigd zijn.',
          tags: ['Coworking', 'Voice', 'Events'],
          prompts: ['Kies één resultaat', 'Werk in een focusblok', 'Toon op het einde bewijs'],
          Icon: Radio,
        },
      ];

  const journey = journeys.find((item) => item.key === activeJourney) ?? journeys[0];
  const space = spaces.find((item) => item.key === activeSpace) ?? spaces[0];
  const SpaceIcon = space.Icon;

  return (
    <div id="top" className="flow-community-page">
      <a className="skip" href="#main">{en ? 'Skip to content' : 'Naar de inhoud'}</a>
      <Header lang={lang} setLang={setLang} current="community" />

      <main id="main">
        <section className="flow-hero">
          <div className="container flow-hero-grid">
            <div className="flow-hero-copy">
              <p className="eyebrow"><span className="accent-line" /> FLOW COMMUNITY / CODEFLOW STUDIOS</p>
              <h1>{en ? <>Share the work.<br/><em>Build the flow.</em></> : <>Deel het werk.<br/><em>Bouw de flow.</em></>}</h1>
              <p className="flow-lead">
                {en
                  ? 'A forum and live Discord space for developers, designers, founders and independent makers who want useful feedback, focused sessions and visible progress.'
                  : 'Een forum en live Discord-ruimte voor developers, designers, founders en zelfstandige makers die bruikbare feedback, gerichte sessies en zichtbare vooruitgang willen.'}
              </p>
              <div className="flow-hero-actions">
                <a className="button" href={discordInviteHref}>{discordActionLabel}<ArrowRight size={19}/></a>
                <a className="text-link" href="#forum">{en ? 'Explore the forum' : 'Ontdek het forum'}<ArrowRight size={17}/></a>
              </div>
              <p className="flow-honesty"><span aria-hidden="true" />{en ? 'Founding preview — no fake members, posts or activity counters.' : 'Oprichtingspreview — geen nepleden, posts of activiteitscijfers.'}</p>
            </div>

            <aside className="flow-entry-card" aria-labelledby="flow-entry-title">
              <div className="flow-card-top"><span>FLOW / ONBOARDING</span><span className="flow-status"><i/>FOUNDING MODE</span></div>
              <p className="flow-card-label">{en ? 'WHAT BRINGS YOU HERE?' : 'WAARVOOR KOM JE?'}</p>
              <h2 id="flow-entry-title">{en ? 'Choose your first path.' : 'Kies je eerste route.'}</h2>
              <div className="flow-journey-options" role="group" aria-label={en ? 'Choose a community goal' : 'Kies een communitydoel'}>
                {journeys.map((item) => <button type="button" key={item.key} onClick={() => setActiveJourney(item.key)} aria-pressed={activeJourney === item.key}>{item.label}</button>)}
              </div>
              <div className="flow-recommendation" aria-live="polite">
                <div><span>{en ? 'ROLE' : 'ROL'}</span><strong>{journey.role}</strong></div>
                <div><span>{en ? 'START IN' : 'START IN'}</span><strong>{journey.channel}</strong></div>
                <p>{journey.action}</p>
              </div>
              <a className="flow-card-action" href={discordInviteHref}>{discordActionLabel}<ArrowUpRight size={17}/></a>
            </aside>
          </div>
        </section>

        <section className="container flow-forum" id="forum" aria-labelledby="flow-forum-title">
          <header className="flow-section-heading">
            <div><p className="eyebrow">01 / {en ? 'THE FORUM' : 'HET FORUM'}</p><h2 id="flow-forum-title">{en ? <>Forum structure,<br/><span>without forum clutter.</span></> : <>Forumstructuur,<br/><span>zonder forumchaos.</span></>}</h2></div>
            <p>{en ? 'Persistent topics live on the web. Fast conversation and coworking live on Discord. Select a space to preview how it works.' : 'Blijvende onderwerpen leven op het web. Snelle gesprekken en coworking leven op Discord. Kies een ruimte om te zien hoe het werkt.'}</p>
          </header>

          <div className="flow-forum-shell">
            <div className="flow-space-tabs" role="tablist" aria-label={en ? 'Community spaces' : 'Communityruimtes'}>
              {spaces.map((item) => {
                const Icon = item.Icon;
                return <button type="button" role="tab" id={`flow-tab-${item.key}`} aria-controls="flow-space-panel" aria-selected={activeSpace === item.key} key={item.key} onClick={() => setActiveSpace(item.key)}><Icon size={19} aria-hidden="true"/><span>{item.label}</span><ArrowRight size={15} aria-hidden="true"/></button>;
              })}
            </div>
            <article className="flow-space-panel" id="flow-space-panel" role="tabpanel" aria-labelledby={`flow-tab-${space.key}`}>
              <div className="flow-space-panel-top"><span>{space.type}</span><SpaceIcon size={26} aria-hidden="true"/></div>
              <h3>{space.title}</h3>
              <p>{space.description}</p>
              <div className="flow-tags">{space.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <div className="flow-prompts"><strong>{en ? 'STARTER PROMPTS' : 'STARTVRAGEN'}</strong><ul>{space.prompts.map((prompt) => <li key={prompt}><Hash size={14} aria-hidden="true"/>{prompt}</li>)}</ul></div>
              <a href={space.key === 'live' ? discordInviteHref : '#community-model'}>{space.key === 'live' ? discordActionLabel : en ? 'See how web and Discord connect' : 'Bekijk hoe web en Discord verbinden'}<ArrowRight size={16}/></a>
            </article>
          </div>
        </section>

        <section className="flow-model" id="community-model" aria-labelledby="flow-model-title">
          <div className="container">
            <header className="flow-section-heading compact"><div><p className="eyebrow">02 / {en ? 'ONE COMMUNITY, TWO MODES' : 'ÉÉN COMMUNITY, TWEE MODI'}</p><h2 id="flow-model-title">{en ? 'Public knowledge. Live momentum.' : 'Publieke kennis. Live momentum.'}</h2></div></header>
            <div className="flow-mode-grid">
              <article><div><Search size={25} aria-hidden="true"/><span>WEB / DURABLE</span></div><h3>{en ? 'The searchable forum' : 'Het vindbare forum'}</h3><p>{en ? 'Build logs, project reviews, useful answers and member showcases remain readable and discoverable outside Discord.' : 'Buildlogs, projectreviews, bruikbare antwoorden en ledenshowcases blijven leesbaar en vindbaar buiten Discord.'}</p><ul><li><CheckCircle2 size={16}/>{en ? 'Public project pages' : 'Publieke projectpagina’s'}</li><li><CheckCircle2 size={16}/>{en ? 'Tagged discussions' : 'Discussies met tags'}</li><li><CheckCircle2 size={16}/>{en ? 'Searchable lessons' : 'Vindbare lessen'}</li></ul></article>
              <article><div><Zap size={25} aria-hidden="true"/><span>DISCORD / LIVE</span></div><h3>{en ? 'The interactive layer' : 'De interactieve laag'}</h3><p>{en ? 'Personal onboarding, role-based channels, quick feedback, voice coworking and scheduled Build Nights create real-time energy.' : 'Persoonlijke onboarding, kanalen per rol, snelle feedback, voice-coworking en geplande Build Nights zorgen voor realtime energie.'}</p><ul><li><CheckCircle2 size={16}/>{en ? 'Choose roles and channels' : 'Kies rollen en kanalen'}</li><li><CheckCircle2 size={16}/>{en ? 'Forum channels and events' : 'Forumkanalen en events'}</li><li><CheckCircle2 size={16}/>{en ? 'Future /build slash command' : 'Toekomstig /build-commando'}</li></ul></article>
            </div>
          </div>
        </section>

        <section className="container flow-rhythm" aria-labelledby="flow-rhythm-title">
          <header className="flow-section-heading"><div><p className="eyebrow">03 / {en ? 'THE COMMUNITY RHYTHM' : 'HET COMMUNITYRITME'}</p><h2 id="flow-rhythm-title">{en ? <>Enough structure<br/><span>to keep moving.</span></> : <>Genoeg structuur<br/><span>om vooruit te blijven gaan.</span></>}</h2></div><p>{en ? 'No invented calendar. Sessions and challenges appear only when a host and date are confirmed.' : 'Geen verzonnen kalender. Sessies en challenges verschijnen pas wanneer een host en datum bevestigd zijn.'}</p></header>
          <div className="flow-rhythm-grid">
            <article><CalendarDays size={25}/><span>01</span><h3>Build Night</h3><p>{en ? 'Focused voice coworking with a start goal and a proof-of-work finish.' : 'Gerichte voice-coworking met een startdoel en bewijs van resultaat op het einde.'}</p></article>
            <article><MessageCircle size={25}/><span>02</span><h3>{en ? 'Review window' : 'Reviewmoment'}</h3><p>{en ? 'A calm moment for specific feedback on work that has enough context.' : 'Een rustig moment voor specifieke feedback op werk met voldoende context.'}</p></article>
            <article><Rocket size={25}/><span>03</span><h3>{en ? 'Show what moved' : 'Toon wat bewoog'}</h3><p>{en ? 'Share progress, the lesson and the next smallest step—finished or not.' : 'Deel vooruitgang, de les en de volgende kleinste stap—afgewerkt of niet.'}</p></article>
          </div>
        </section>

        <section className="flow-code" aria-labelledby="flow-code-title">
          <div className="container flow-code-grid">
            <div><p className="eyebrow">04 / COMMUNITY CODE</p><h2 id="flow-code-title">{en ? <>Useful over loud.<br/><span>Human over hype.</span></> : <>Bruikbaar boven luid.<br/><span>Menselijk boven hype.</span></>}</h2><p>{en ? 'Flow Community is a Codeflow Studios initiative. The community can support the studio, but every conversation does not become a sales pitch.' : 'Flow Community is een initiatief van Codeflow Studios. De community mag de studio ondersteunen, maar niet elk gesprek wordt een verkooppraatje.'}</p></div>
            <ol><li><span>01</span><div><strong>{en ? 'Show context' : 'Toon context'}</strong><p>{en ? 'Explain the goal, constraints and what you tried.' : 'Leg het doel, de beperkingen en je pogingen uit.'}</p></div></li><li><span>02</span><div><strong>{en ? 'Give actionable feedback' : 'Geef bruikbare feedback'}</strong><p>{en ? 'Be specific, kind and honest.' : 'Wees specifiek, vriendelijk en eerlijk.'}</p></div></li><li><span>03</span><div><strong>{en ? 'No fake growth' : 'Geen nepgroei'}</strong><p>{en ? 'No bought followers, fabricated reviews or activity theatre.' : 'Geen gekochte volgers, verzonnen reviews of toneelactiviteit.'}</p></div></li><li><span>04</span><div><strong>{en ? 'Protect the room' : 'Bescherm de ruimte'}</strong><p>{en ? 'Clear moderation, reporting and boundaries come before scale.' : 'Duidelijke moderatie, meldingen en grenzen komen vóór schaal.'}</p></div></li></ol>
          </div>
        </section>

        <section className="container flow-final">
          <Users size={30} aria-hidden="true"/>
          <p className="eyebrow">FLOW COMMUNITY / FOUNDING PHASE</p>
          <h2>{en ? 'Join before the noise.' : 'Sluit aan vóór de drukte.'}</h2>
          <p>{en ? 'Help shape the first forum spaces, Build Nights and community tools.' : 'Help de eerste forumruimtes, Build Nights en communitytools vormgeven.'}</p>
          <div><a className="button" href={discordInviteHref}>{discordActionLabel}<ArrowRight size={19}/></a><a className="flow-shop-button" href={shopUrl} target="_blank" rel="noreferrer"><Store size={18}/>{en ? 'Visit Flow Shop' : 'Bezoek Flow Shop'}<ArrowUpRight size={16}/></a></div>
        </section>
      </main>

      <Footer lang={lang}/>
    </div>
  );
}
