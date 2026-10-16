'use client';

import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Header, Footer, CTA, useLanguage } from '@/components/codeflow/shared';
import type { Language } from '@/components/codeflow/shared';
import InquiryForm from './inquiry-form';

export default function FreeAudit({ initialLang='nl' }: { initialLang?: Language }) {
  const { lang, setLang, en } = useLanguage(initialLang);
  const points = en
    ? ['Website & mobile conversion review', 'Visibility and marketing opportunities', 'Practical automation opportunities', 'Three priority actions — no obligation']
    : ['Website- en mobiele conversiecheck', 'Zichtbaarheid en marketingkansen', 'Praktische automatiseringskansen', 'Drie prioritaire acties — zonder verplichting'];

  return <div id="top" className="audit-page">
    <Header lang={lang} setLang={setLang}/>
    <main>
      <section className="hero container audit-hero">
        <div className="hero-copy audit-copy">
          <p className="eyebrow"><span className="accent-line"/> {en?'FREE DIGITAL AUDIT':'GRATIS DIGITALE AUDIT'}</p>
          <h1>{en?<>Find what is holding your business <em>back online.</em></>:<>Ontdek wat jouw bedrijf online <em>tegenhoudt.</em></>}</h1>
          <p className="hero-description">{en
            ? 'We review your website, digital presence and opportunities for smarter automation, then give you concrete next steps.'
            : 'We bekijken je website, digitale aanwezigheid en kansen voor slimmere automatisering en geven je concrete volgende stappen.'}</p>
          <div className="hero-actions audit-actions">
            <CTA href="#audit-form">{en?'Request my free audit':'Vraag mijn gratis audit'}</CTA>
            <a className="audit-secondary" href={`/?lang=${lang}#services`}>{en?'See our services':'Bekijk onze diensten'} <ArrowUpRight size={18}/></a>
          </div>
        </div>
        <div className="audit-form-visual" id="audit-form"><InquiryForm lang={lang} kind="audit"/></div>
      </section>
      <section className="inquiry-section container" aria-label={en?'Request a free audit':'Vraag een gratis audit'}><div className="inquiry-section-copy"><p className="eyebrow">{en?'YOUR NEXT STEP':'JOUW VOLGENDE STAP'}</p><h2>{en?<>A fresh look.<br/><em>A clear direction.</em></>:<>Een frisse blik.<br/><em>Een helder plan.</em></>}</h2><p>{en?'Share your website and what you want to improve. We will look at the opportunities for your business.':'Deel je website en wat je wil verbeteren. Wij bekijken waar de kansen voor jouw bedrijf liggen.'}</p></div>        <aside className="audit-panel" aria-label={en?'Audit deliverables':'Wat de audit bevat'}>
          <p className="eyebrow">CODEFLOW / AUDIT</p>
          <h2>{en?'What you get':'Wat je krijgt'}</h2>
          <div className="audit-points">{points.map(point=><p key={point}><CheckCircle2 size={20}/><span>{point}</span></p>)}</div>
          <p className="audit-panel-note">{en?'Built for SMEs that want more leads, a stronger digital presence or less repetitive work.':'Voor kmo’s die meer leads, een sterkere digitale aanwezigheid of minder repetitief werk willen.'}</p>
        </aside></section>
      <section className="contact-section"><div className="container">
        <div className="contact-top"><p className="eyebrow">01 / {en?'START HERE':'START HIER'}</p><span>{en?'NO OBLIGATION':'ZONDER VERPLICHTING'}</span></div>
        <h2>{en?<>Your next customer<br/>could already be <em>looking.</em></>:<>Je volgende klant<br/>kan nu al <em>zoeken.</em></>}</h2>
        <div className="contact-bottom"><a className="contact-email" href="#audit-form">{en?'Request the audit':'Vraag de audit'}<ArrowUpRight size={30}/></a></div>
      </div></section>
    </main>
    <Footer lang={lang}/>
  </div>;
}
