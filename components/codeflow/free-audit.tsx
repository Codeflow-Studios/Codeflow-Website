'use client';

import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Header, Footer, CTA, useLanguage, email } from '@/components/codeflow/shared';
import type { Language } from '@/components/codeflow/shared';

export default function FreeAudit({ initialLang='nl' }: { initialLang?: Language }) {
  const { lang, setLang, en } = useLanguage(initialLang);
  const subject = en ? 'Free Codeflow digital audit' : 'Gratis Codeflow digitale audit';
  const body = en
    ? 'Hi Codeflow Studios,%0D%0A%0D%0AI would like a free digital audit.%0D%0ACompany:%0D%0AWebsite:%0D%0AMain goal:%0D%0A%0D%0AThanks!'
    : 'Hallo Codeflow Studios,%0D%0A%0D%0AIk wil graag een gratis digitale audit.%0D%0ABedrijf:%0D%0AWebsite:%0D%0ABelangrijkste doel:%0D%0A%0D%0ABedankt!';
  const points = en
    ? ['Website & mobile conversion review', 'Visibility and marketing opportunities', 'Practical automation opportunities', 'Three priority actions — no obligation']
    : ['Website- en mobiele conversiecheck', 'Zichtbaarheid en marketingkansen', 'Praktische automatiseringskansen', 'Drie prioritaire acties — zonder verplichting'];

  return <div id="top">
    <Header lang={lang} setLang={setLang}/>
    <main>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow"><span className="accent-line"/> {en?'FREE DIGITAL AUDIT':'GRATIS DIGITALE AUDIT'}</p>
          <h1>{en?<>Find what is<br/>holding your business<br/><em>back online.</em></>:<>Ontdek wat jouw<br/>bedrijf online<br/><em>tegenhoudt.</em></>}</h1>
          <p className="hero-description">{en
            ? 'We review your website, digital presence and opportunities for smarter automation, then give you concrete next steps.'
            : 'We bekijken je website, digitale aanwezigheid en kansen voor slimmere automatisering en geven je concrete volgende stappen.'}</p>
          <div className="hero-actions">
            <CTA href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`}>{en?'Request my free audit':'Vraag mijn gratis audit'}</CTA>
            <a className="text-link" href={`/?lang=${lang}#services`}>{en?'See our services':'Bekijk onze diensten'} <ArrowUpRight size={18}/></a>
          </div>
        </div>
        <div className="hero-visual audit-panel">
          <p className="eyebrow">CODEFLOW / AUDIT</p>
          <h2>{en?'What you get':'Wat je krijgt'}</h2>
          <div className="audit-points">{points.map(point=><p key={point}><CheckCircle2 size={20}/><span>{point}</span></p>)}</div>
          <p>{en?'Built for SMEs that want more leads, a stronger digital presence or less repetitive work.':'Voor kmo’s die meer leads, een sterkere digitale aanwezigheid of minder repetitief werk willen.'}</p>
        </div>
      </section>
      <section className="contact-section"><div className="container">
        <div className="contact-top"><p className="eyebrow">01 / {en?'START HERE':'START HIER'}</p><span>{en?'NO OBLIGATION':'ZONDER VERPLICHTING'}</span></div>
        <h2>{en?<>Your next customer<br/>could already be <em>looking.</em></>:<>Je volgende klant<br/>kan nu al <em>zoeken.</em></>}</h2>
        <div className="contact-bottom"><a className="contact-email" href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`}>{en?'Request the audit':'Vraag de audit'}<ArrowUpRight size={30}/></a></div>
      </div></section>
    </main>
    <Footer lang={lang}/>
  </div>;
}
