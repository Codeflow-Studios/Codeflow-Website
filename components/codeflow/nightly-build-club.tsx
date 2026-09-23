'use client';

import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  MessageCircle,
  Moon,
  PackageOpen,
  Rocket,
} from 'lucide-react';
import { Footer, Header, email, useLanguage } from './shared';
import type { Language } from './shared';

const shopUrl = 'https://dp1r61-j0.myshopify.com';

export default function NightlyBuildClub({
  initialLang = 'nl',
}: {
  initialLang?: Language;
}) {
  const { lang, setLang, en } = useLanguage(initialLang);
  const emailInviteRequest = `mailto:${email}?subject=${encodeURIComponent(
    'Nightly Build Club — Discord invite',
  )}`;
  const configuredDiscordUrl = process.env.NEXT_PUBLIC_NIGHTLY_DISCORD_URL?.trim();
  const discordInviteHref = configuredDiscordUrl || emailInviteRequest;
  const discordActionLabel = configuredDiscordUrl
    ? 'Open Discord'
    : en ? 'Request a Discord invite' : 'Vraag een Discord-uitnodiging';

  const steps = en
    ? [
        {
          number: '01',
          title: 'Choose one small finish line',
          body: 'Turn a vague side project into one task you can complete in a focused session.',
          Icon: Clock3,
        },
        {
          number: '02',
          title: 'Build alongside other makers',
          body: 'Use Discord build sessions for company, momentum, quick questions and honest feedback.',
          Icon: MessageCircle,
        },
        {
          number: '03',
          title: 'Show what became real',
          body: 'Share the result, the lesson and the next smallest step. Progress counts when it ships.',
          Icon: Rocket,
        },
      ]
    : [
        {
          number: '01',
          title: 'Kies één kleine finishlijn',
          body: 'Maak van een vaag zijproject één taak die je in een gerichte sessie kunt afwerken.',
          Icon: Clock3,
        },
        {
          number: '02',
          title: 'Bouw naast andere makers',
          body: 'Gebruik Discord-sessies voor gezelschap, momentum, snelle vragen en eerlijke feedback.',
          Icon: MessageCircle,
        },
        {
          number: '03',
          title: 'Toon wat echt geworden is',
          body: 'Deel het resultaat, de les en de volgende kleine stap. Vooruitgang telt wanneer je iets uitbrengt.',
          Icon: Rocket,
        },
      ];

  const rhythm = en
    ? [
        ['MON', 'Pick one finishable goal', 'A clear promise for your next small session.'],
        ['THU', 'Build Night', 'A focused 60–90 minute coworking session on Discord.'],
        ['FRI', 'Show what you shipped', 'Share the result, including unfinished lessons.'],
        ['MONTHLY', '30-Minute Build Challenge', 'One prompt, one short session, one public outcome.'],
      ]
    : [
        ['MA', 'Kies één haalbaar doel', 'Een duidelijke belofte voor je volgende kleine sessie.'],
        ['DO', 'Build Night', 'Een gerichte coworkingsessie van 60–90 minuten op Discord.'],
        ['VR', 'Toon wat je uitbracht', 'Deel het resultaat, ook wanneer de belangrijkste winst een les was.'],
        ['MAANDELIJKS', '30-Minute Build Challenge', 'Eén opdracht, één korte sessie en één zichtbaar resultaat.'],
      ];

  return (
    <div id="top" className="night-club-page">
      <a className="skip" href="#main">
        {en ? 'Skip to content' : 'Naar de inhoud'}
      </a>
      <Header lang={lang} setLang={setLang} current="community" />

      <main id="main">
        <section className="club-hero">
          <div className="container club-hero-grid">
            <div className="club-hero-copy">
              <p className="eyebrow">
                <span className="accent-line" />
                <span>NIGHTLY BUILD CLUB / BY CODEFLOW STUDIOS</span>
              </p>
              <h1>
                Small sessions.<br />
                <em>Real builds.</em>
              </h1>
              <p className="club-lead">
                {en
                  ? 'A community for developers, designers and independent makers who want to turn after-hours ideas into finished work — one focused session at a time.'
                  : 'Een community voor developers, designers en zelfstandige makers die avondideeën willen omzetten in afgewerkt werk — één gerichte sessie tegelijk.'}
              </p>
              <div className="club-hero-actions">
                <a className="button" href={discordInviteHref}>
                  {discordActionLabel}
                  <ArrowRight size={19} />
                </a>
                <a className="text-link" href={shopUrl} target="_blank" rel="noreferrer">
                  {en ? 'Visit the shop' : 'Bezoek de shop'} <ArrowUpRight size={18} />
                </a>
              </div>
              <p className="club-founding-note">
                <span aria-hidden="true" />
                {en
                  ? 'Founding phase — real members, no follower buying and no fake activity.'
                  : 'Oprichtingsfase — echte leden, geen gekochte volgers en geen nepactiviteit.'}
              </p>
            </div>

            <div
              className="club-session-board"
              aria-label={en ? 'Night session plan' : 'Plan voor een nachtsessie'}
            >
              <div className="club-board-head">
                <span>NBC / SESSION 001</span>
                <Moon size={19} aria-hidden="true" />
              </div>
              <p className="club-board-label">{en ? 'TONIGHT’S BUILD' : 'BUILD VAN VANAVOND'}</p>
              <h2>{en ? 'Move one real thing forward.' : 'Breng één echt ding vooruit.'}</h2>
              <div className="club-board-steps">
                <div>
                  <span>01</span>
                  <p><strong>{en ? 'Plan' : 'Plan'}</strong>{en ? 'One clear outcome' : 'Eén duidelijk resultaat'}</p>
                  <b>10m</b>
                </div>
                <div>
                  <span>02</span>
                  <p><strong>{en ? 'Build' : 'Bouw'}</strong>{en ? 'No tab hopping' : 'Geen tabbladenrace'}</p>
                  <b>60m</b>
                </div>
                <div>
                  <span>03</span>
                  <p><strong>{en ? 'Ship' : 'Deel'}</strong>{en ? 'Post the proof' : 'Toon het bewijs'}</p>
                  <b>05m</b>
                </div>
              </div>
              <div className="club-board-status">
                <CheckCircle2 size={19} aria-hidden="true" />
                <span>{en ? 'Success = visible progress' : 'Succes = zichtbare vooruitgang'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="club-method container" aria-labelledby="club-method-title">
          <div className="club-section-heading">
            <p className="eyebrow">01 / {en ? 'HOW THE CLUB WORKS' : 'HOE DE CLUB WERKT'}</p>
            <h2 id="club-method-title">
              {en ? <>Less announcing.<br /><span>More finishing.</span></> : <>Minder aankondigen.<br /><span>Meer afwerken.</span></>}
            </h2>
            <p>
              {en
                ? 'You do not need an audience, a polished idea or an all-nighter. You only need one honest next step.'
                : 'Je hebt geen publiek, perfect idee of nacht zonder slaap nodig. Alleen één eerlijke volgende stap.'}
            </p>
          </div>
          <div className="club-step-grid">
            {steps.map(({ number, title, body, Icon }) => (
              <article key={number}>
                <div><Icon size={27} strokeWidth={1.6} aria-hidden="true" /><span>{number}</span></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="club-places" aria-labelledby="club-places-title">
          <div className="container">
            <div className="club-section-heading compact">
              <p className="eyebrow">02 / {en ? 'ONE CLUB, THREE PLACES' : 'ÉÉN CLUB, DRIE PLEKKEN'}</p>
              <h2 id="club-places-title">{en ? 'Every channel has a job.' : 'Elk kanaal heeft een taak.'}</h2>
            </div>
            <div className="club-place-grid">
              <article>
                <MessageCircle size={29} aria-hidden="true" />
                <span>LIVE</span>
                <h3>Discord</h3>
                <p>{en ? 'Quick conversation, voice coworking, Build Nights and mutual momentum.' : 'Snelle gesprekken, voice-coworking, Build Nights en gezamenlijk momentum.'}</p>
                <a href={discordInviteHref}>{configuredDiscordUrl ? 'Open Discord' : en ? 'Request an invite' : 'Vraag een uitnodiging'} <ArrowUpRight size={16} /></a>
              </article>
              <article>
                <Code2 size={29} aria-hidden="true" />
                <span>PUBLIC</span>
                <h3>{en ? 'Web hub' : 'Webhub'}</h3>
                <p>{en ? 'The permanent home for the club, public build stories, challenges and future member showcases.' : 'De vaste thuis voor de club, publieke buildverhalen, challenges en toekomstige ledenshowcases.'}</p>
                <a href="#rhythm">{en ? 'See the starting rhythm' : 'Bekijk het startritme'} <ArrowRight size={16} /></a>
              </article>
              <article>
                <PackageOpen size={29} aria-hidden="true" />
                <span>TOOLS</span>
                <h3>{en ? 'Builder shop' : 'Buildershop'}</h3>
                <p>{en ? 'Practical planners and kits that support the work. Buying is optional; building comes first.' : 'Praktische planners en kits die het werk ondersteunen. Kopen is optioneel; bouwen komt eerst.'}</p>
                <a href={shopUrl} target="_blank" rel="noreferrer">{en ? 'Open the shop' : 'Open de shop'} <ArrowUpRight size={16} /></a>
              </article>
            </div>
          </div>
        </section>

        <section className="club-rhythm container" id="rhythm" aria-labelledby="club-rhythm-title">
          <div className="club-rhythm-intro">
            <p className="eyebrow">03 / {en ? 'THE STARTING RHYTHM' : 'HET STARTRITME'}</p>
            <h2 id="club-rhythm-title">
              {en ? <>A repeatable week.<br /><span>Built for real life.</span></> : <>Een herhaalbare week.<br /><span>Gemaakt voor het echte leven.</span></>}
            </h2>
            <p>{en ? 'This is the rhythm being prepared for the first members. Dates will only be announced when they are confirmed.' : 'Dit ritme wordt voorbereid voor de eerste leden. Datums worden pas aangekondigd wanneer ze vastliggen.'}</p>
          </div>
          <div className="club-rhythm-list">
            {rhythm.map(([day, title, body], index) => (
              <article key={day}>
                <span>{day}</span>
                <div><h3>{title}</h3><p>{body}</p></div>
                <b>{String(index + 1).padStart(2, '0')}</b>
              </article>
            ))}
          </div>
        </section>

        <section className="club-codeflow">
          <div className="container club-codeflow-grid">
            <div className="club-codeflow-art" aria-hidden="true">
              <img src="/brand-flow.png" alt="" width="1254" height="1254" />
              <span>CODEFLOW / COMMUNITY LAB</span>
            </div>
            <div className="club-codeflow-copy">
              <p className="eyebrow">04 / {en ? 'BUILT BY CODEFLOW STUDIOS' : 'GEBOUWD DOOR CODEFLOW STUDIOS'}</p>
              <h2>{en ? <>The community is part of<br /><span>the studio’s work.</span></> : <>De community is deel van<br /><span>het werk van de studio.</span></>}</h2>
              <p>{en ? 'Nightly Build Club is where Codeflow shares process, experiments and useful lessons from design, software and marketing — without turning every conversation into a sales pitch.' : 'Nightly Build Club is waar Codeflow processen, experimenten en bruikbare lessen uit design, software en marketing deelt — zonder van elk gesprek een verkooppraatje te maken.'}</p>
              <a className="text-link" href={`/?lang=${lang}#services`}>{en ? 'Explore Codeflow Studios' : 'Ontdek Codeflow Studios'} <ArrowUpRight size={18} /></a>
            </div>
          </div>
        </section>

        <section className="club-final container">
          <CalendarDays size={31} aria-hidden="true" />
          <p className="eyebrow">{en ? 'FOUNDING PHASE' : 'OPRICHTINGSFASE'}</p>
          <h2>{en ? 'Be there for session one.' : 'Wees erbij vanaf sessie één.'}</h2>
          <p>{en ? 'Ask for access now and receive the confirmed first Build Night details directly.' : 'Vraag nu toegang en ontvang de bevestigde details van de eerste Build Night rechtstreeks.'}</p>
          <a className="button" href={discordInviteHref}>{discordActionLabel} <ArrowRight size={19} /></a>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
