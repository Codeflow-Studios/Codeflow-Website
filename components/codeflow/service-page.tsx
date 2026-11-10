'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Header, Footer, useLanguage } from './shared';
import Packages, { serviceLabels, type Service } from './packages';
import GameShowcase from './game-showcase';
import DesignShowcase from './design-showcase';

const content = {
  marketing: {
    eyebrow: { nl: 'EEN HELDERE RICHTING', en: 'A CLEAR DIRECTION' },
    title: { nl: 'Weet wie je wil bereiken. En hoe.', en: 'Know who to reach. And how.' },
    intro: {
      nl: 'Een praktisch plan voor je boodschap, kanalen en content. Met acties die passen bij jouw bedrijf en de tijd die je hebt.',
      en: 'A practical plan for your message, channels and content, with actions that fit your business and the time you have.',
    },
  },
  design: {
    eyebrow: { nl: 'GRAFISCH DESIGN', en: 'GRAPHIC DESIGN' },
    title: { nl: 'Laat je bedrijf herkenbaar zien.', en: 'Make your business recognisable.' },
    intro: {
      nl: 'Van een logo tot een samenhangende huisstijl. We maken een visuele basis die je kunt gebruiken op je website, drukwerk en sociale media.',
      en: 'From a logo to a coherent visual identity. We create a foundation you can use across your website, print materials and social media.',
    },
  },
  software: {
    eyebrow: { nl: 'WEBSITES & SOFTWARE', en: 'WEBSITES & SOFTWARE' },
    title: { nl: 'Een website die aanvragen makkelijker maakt.', en: 'A website that makes enquiries easier.' },
    intro: {
      nl: 'Toon je werk, leg je diensten helder uit en help bezoekers de volgende stap te zetten. Extra software of koppelingen bekijken we wanneer je die nodig hebt.',
      en: 'Showcase your work, explain your services and help visitors take the next step. We discuss extra software or integrations when you need them.',
    },
  },
  rebranding: {
    eyebrow: { nl: 'REBRANDING', en: 'REBRANDING' },
    title: { nl: 'Je bedrijf groeit. Je uitstraling groeit mee.', en: 'Your business moves forward. Your brand follows.' },
    intro: {
      nl: 'We stemmen je boodschap, visuele identiteit en website op elkaar af. Eén gerichte vernieuwing, met een vooraf afgesproken omvang.',
      en: 'We bring your message, visual identity and website together in one focused refresh, with the scope agreed in advance.',
    },
  },
} as const;

export default function ServicePage({ service }: { service: Service }) {
  const { lang, setLang, en } = useLanguage();
  const item = content[service];
  return <div id="top">
    <a className="skip" href="#main">{en ? 'Skip to content' : 'Naar de inhoud'}</a>
    <Header lang={lang} setLang={setLang}/>
    <main id="main">
      <section className={`service-hero service-hero-${service}`}>
        <div className="container">
          <a className="service-back" href={`/?lang=${lang}#services`}><ArrowLeft size={17} aria-hidden="true"/>{en ? 'Back to our offer' : 'Terug naar het aanbod'}</a>
          <p className="eyebrow">{item.eyebrow[lang]}</p>
          <h1>{item.title[lang]}</h1>
          <p>{item.intro[lang]}</p>
          <a className="button" href="#packages">{en ? 'See the approach & price' : 'Bekijk aanpak & prijs'}<ArrowRight size={18} aria-hidden="true"/></a>
        </div>
      </section>
      <Packages lang={lang} service={service} standalone/>
      {service === 'design' && <DesignShowcase lang={lang}/>}
      {service === 'software' && <>
        <div className="container package-category"><p className="eyebrow">{en ? 'ALSO FROM THE STUDIO' : 'OOK UIT DE STUDIO'}</p><h2>{en ? 'Our own game projects' : 'Onze eigen gameprojecten'}</h2><p>{en ? 'Creative development in practice: explore our playable games and prototypes.' : 'Creatieve ontwikkeling in de praktijk: bekijk onze speelbare games en prototypes.'}</p></div>
        <GameShowcase lang={lang}/>
      </>}
      <section className="service-switch container">
        <p>{en ? 'Looking for something else?' : 'Iets anders nodig?'}</p>
        <div>{(['marketing', 'design', 'software', 'rebranding'] as Service[]).filter(key => key !== service).map(key => <a key={key} href={`/services/${key === 'design' ? 'graphic-design' : key === 'software' ? 'software-development' : key}?lang=${lang}`}>{serviceLabels[lang][key]}<ArrowRight size={16} aria-hidden="true"/></a>)}</div>
      </section>
    </main>
    <Footer lang={lang}/>
  </div>;
}
