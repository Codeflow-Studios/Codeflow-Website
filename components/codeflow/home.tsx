'use client';

import { ArrowUpRight, Check, Search, PenTool, Send } from 'lucide-react';
import { Header, Footer, CTA, useLanguage, type Language } from './shared';

export default function Home({ initialLang = 'nl' }: { initialLang?: Language }) {
  const { lang, setLang, en } = useLanguage(initialLang);
  const auditUrl = `/free-audit?lang=${lang}`;
  const features = en
    ? ['Up to 5 pages, in one language', 'Clear copy and a design that fits your business', 'A quote-request form with automatic acknowledgement', 'Mobile layout and enquiry measurement', '2 revision rounds and a practical handover']
    : ['Tot 5 pagina’s, in één taal', 'Heldere teksten en een ontwerp dat bij je bedrijf past', 'Een offerteformulier met automatische ontvangstbevestiging', 'Mobiele weergave en meting van aanvragen', '2 feedbackrondes en een praktische overdracht'];
  const steps = en ? [
    { title: 'First, a fresh look.', text: 'Share your website. You receive three concrete priorities to improve it.', Icon: Search },
    { title: 'Then, a clear proposal.', text: 'We agree on the scope, price and timing before any work starts.', Icon: PenTool },
    { title: 'Build, check, launch.', text: 'We design and build, review it together and show you how everything works.', Icon: Send },
  ] : [
    { title: 'Eerst een frisse blik.', text: 'Deel je website. Je krijgt drie concrete prioriteiten om ermee vooruit te gaan.', Icon: Search },
    { title: 'Daarna een heldere offerte.', text: 'We spreken de inhoud, prijs en planning af vóór het werk begint.', Icon: PenTool },
    { title: 'Bouwen, testen, lanceren.', text: 'We ontwerpen en bouwen, bekijken alles samen en tonen hoe het werkt.', Icon: Send },
  ];

  return <div id="top" className="client-home">
    <a className="skip" href="#main">{en ? 'Skip to content' : 'Naar de inhoud'}</a>
    <Header lang={lang} setLang={setLang} />
    <main id="main">
      <section className="hero container client-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="accent-line" />{en ? 'WEBSITES & DESIGN · BRUGES' : 'WEBSITES & DESIGN · BRUGGE'}</p>
          <h1>{en ? <>Good work.<br />A website that<br /><em>shows it.</em></> : <>Goed werk.<br />Een website die<br /><em>het laat zien.</em></>}</h1>
          <p className="hero-description">{en
            ? 'For independent businesses and SMEs in Bruges and West Flanders. We make your offer clear and help visitors take the next step: requesting a quote.'
            : 'Voor zelfstandigen en kmo’s in Brugge en West-Vlaanderen. We maken je aanbod helder en helpen bezoekers de volgende stap zetten: een offerte aanvragen.'}</p>
          <div className="hero-actions">
            <CTA href={auditUrl}>{en ? 'Get my free website audit' : 'Vraag mijn gratis websitecheck'}</CTA>
            <a className="text-link" href="#services">{en ? 'See the offer' : 'Bekijk het aanbod'} <ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
          <p className="client-hero-note">{en ? 'Three concrete improvements. Free, with no obligation.' : 'Drie concrete verbeterpunten. Gratis en vrijblijvend.'}</p>
        </div>
        <div className="hero-visual client-visual">
          <div className="visual-label"><span>CREATIVE MINDS.</span><span>TECHNICAL DNA.</span></div>
          <img className="flow-art" src="/brand-flow.webp" alt="" width="1254" height="1254" fetchPriority="high" />
          <div className="client-visual-caption"><span>01 — 02 — 03</span><p>{en ? 'Show your work. Build trust. Make contact easy.' : 'Toon je werk. Wek vertrouwen. Maak contact eenvoudig.'}</p></div>
        </div>
      </section>

      <section className="client-offer container" id="services" aria-labelledby="offer-title">
        <div className="client-offer-copy">
          <p className="eyebrow">01 / {en ? 'ONE CLEAR START' : 'ÉÉN HELDERE START'}</p>
          <h2 id="offer-title">{en ? <>Your website.<br /><em>Your next enquiry.</em></> : <>Jouw website.<br /><em>Jouw volgende aanvraag.</em></>}</h2>
          <p>{en ? 'Your work deserves more than a name and a phone number online. Show what you do, who you help and why someone should get in touch.' : 'Je werk verdient meer dan een naam en een telefoonnummer online. Laat zien wat je doet, voor wie je werkt en waarom iemand contact moet opnemen.'}</p>
          <p>{en ? 'A focused starting point for service businesses, from renovation and installation firms to independent specialists.' : 'Een gerichte start voor dienstverleners: van renovatie- en installatiebedrijven tot zelfstandige specialisten.'}</p>
          <a className="text-link" href={`/contact?lang=${lang}&service=${encodeURIComponent(en ? 'Website + enquiries' : 'Website + aanvragen')}`}>{en ? 'Discuss my project' : 'Bespreek mijn project'} <ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
        <article className="client-offer-card">
          <p className="eyebrow">{en ? 'WEBSITE + ENQUIRIES' : 'WEBSITE + AANVRAGEN'}</p>
          <p className="client-offer-price"><span>{en ? 'From' : 'Vanaf'}</span> € {en ? '2,450' : '2.450'} <small>{en ? 'excl. VAT / project' : 'excl. btw / project'}</small></p>
          <ul>{features.map(feature => <li key={feature}><Check size={19} aria-hidden="true" /><span>{feature}</span></li>)}</ul>
          <CTA href={auditUrl}>{en ? 'Start with a free audit' : 'Start met een gratis websitecheck'}</CTA>
          <p className="client-offer-terms">{en ? 'You supply photos and project information. Final scope, timing, hosting and any licence costs are agreed in your quote. Custom apps and a full rebrand are quoted separately.' : 'Jij levert foto’s en projectinformatie. De precieze inhoud, planning, hosting en eventuele licentiekosten spreken we af in je offerte. Maatwerkapps en een volledige rebranding krijgen een aparte offerte.'}</p>
        </article>
      </section>

      <section className="client-work" id="work" aria-labelledby="work-title">
        <div className="container">
          <div className="client-section-heading"><div><p className="eyebrow">02 / {en ? 'A LOOK AT OUR WORK' : 'EEN KIJK OP ONS WERK'}</p><h2 id="work-title">{en ? 'Design with a purpose.' : 'Ontwerp dat ergens voor staat.'}</h2></div><p>{en ? 'A recognisable identity, applied consistently.' : 'Een herkenbare identiteit, consequent toegepast.'}</p></div>
          <article className="client-case">
            <div className="client-case-image"><img src="/work/atn/business-card-front.png" alt={en ? 'ATN business card design in silver, black and blue' : 'ATN-visitekaartje in zilver, zwart en blauw'} width="2008" height="1299" loading="lazy" /></div>
            <div className="client-case-copy"><p className="eyebrow">ATN BV / {en ? 'VISUAL IDENTITY' : 'VISUELE IDENTITEIT'}</p><h3>{en ? 'From logo to business card.' : 'Van beeldmerk tot visitekaartje.'}</h3><p>{en ? 'A technical identity in silver, black and blue. One visual language, carried through from the logo to printed material.' : 'Een technische identiteit in zilver, zwart en blauw. Eén beeldtaal, doorgetrokken van het logo tot het drukwerk.'}</p><a className="text-link" href={`/services/graphic-design?lang=${lang}#selected-work`}>{en ? 'View the design work' : 'Bekijk het ontwerpwerk'} <ArrowUpRight size={18} aria-hidden="true" /></a></div>
          </article>
          <p className="client-own-work">{en ? 'This website is also our own work: design, development and enquiry flow, brought together in one studio.' : 'Ook deze website is eigen werk: ontwerp, ontwikkeling en aanvraagflow, samengebracht in één studio.'}</p>
        </div>
      </section>

      <section className="client-process container" aria-labelledby="process-title">
        <div className="client-section-heading"><div><p className="eyebrow">03 / {en ? 'HOW WE WORK' : 'ZO WERKEN WE'}</p><h2 id="process-title">{en ? 'Clear from the start.' : 'Duidelijk vanaf de start.'}</h2></div></div>
        <div className="process-grid">{steps.map(({ title, text, Icon }, index) => <article className="process" key={title}><div className="process-top"><Icon size={25} aria-hidden="true" /><span>0{index + 1}</span></div><h3>{title}</h3><p>{text}</p></article>)}</div>
        <div className="client-extra"><p>{en ? 'Need a logo, a rebrand or custom software?' : 'Een logo, rebranding of software op maat nodig?'}</p><a className="text-link" href={`/contact?lang=${lang}`}>{en ? 'Tell us what you need' : 'Vertel wat je nodig hebt'} <ArrowUpRight size={17} aria-hidden="true" /></a></div>
      </section>

      <section className="client-contact" id="contact" aria-labelledby="contact-title"><div className="container client-contact-inner">
        <div><p className="eyebrow">{en ? 'YOUR NEXT STEP' : 'JOUW VOLGENDE STAP'}</p><h2 id="contact-title">{en ? <>What could your<br />website do <em>better?</em></> : <>Wat kan jouw<br />website <em>beter?</em></>}</h2><p>{en ? 'Send us your website. We will look at your message, the mobile experience and the path to an enquiry. You receive three practical priorities.' : 'Stuur ons je website. We bekijken je verhaal, de mobiele ervaring en de weg naar een aanvraag. Je krijgt drie praktische prioriteiten.'}</p><CTA href={auditUrl}>{en ? 'Get my free website audit' : 'Vraag mijn gratis websitecheck'}</CTA><span className="client-contact-note">{en ? 'Free. No subscription. You decide what comes next.' : 'Gratis. Geen abonnement. Jij beslist over de volgende stap.'}</span></div>
        <aside className="client-contact-direct"><p className="eyebrow">{en ? 'PREFER TO TALK FIRST?' : 'LIEVER EERST EVEN OVERLEGGEN?'}</p><a href="tel:+32480667519">+32 480 66 75 19</a><a href="https://wa.me/32480667519" target="_blank" rel="noreferrer">WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></a><a href={`/contact?lang=${lang}`}>{en ? 'Send a message' : 'Stuur een bericht'} <ArrowUpRight size={18} aria-hidden="true" /></a><p>{en ? 'No website yet? Tell us about your business and what you want to build.' : 'Nog geen website? Vertel ons over je bedrijf en wat je wil opbouwen.'}</p></aside>
      </div></section>
    </main>
    <Footer lang={lang} />
  </div>;
}
