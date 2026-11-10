'use client';

import { CheckCircle2 } from 'lucide-react';
import { Header, Footer, CTA, useLanguage } from '@/components/codeflow/shared';
import type { Language } from '@/components/codeflow/shared';
import InquiryForm from './inquiry-form';

export default function FreeAudit({ initialLang = 'nl' }: { initialLang?: Language }) {
  const { lang, setLang, en } = useLanguage(initialLang);
  const points = en
    ? [
      'A clear first impression: can visitors see what you offer and who you help?',
      'An easier enquiry: can customers find their way and contact you on mobile?',
      'Practical follow-up: where could a simple improvement save you work?',
    ]
    : [
      'Een heldere eerste indruk: zien bezoekers wat je doet en voor wie?',
      'Een vlotte aanvraag: vinden klanten hun weg en kunnen ze je mobiel bereiken?',
      'Praktische opvolging: waar kan een eenvoudige verbetering je werk besparen?',
    ];

  return <div id="top" className="audit-page">
    <a className="skip" href="#main">{en ? 'Skip to content' : 'Naar de inhoud'}</a>
    <Header lang={lang} setLang={setLang}/>
    <main id="main">
      <section className="hero container audit-hero">
        <div className="hero-copy audit-copy">
          <p className="eyebrow"><span className="accent-line"/> {en ? 'FREE WEBSITE AUDIT' : 'GRATIS WEBSITECHECK'}</p>
          <h1>{en ? <>Make enquiries <em>easier.</em></> : <>Maak aanvragen <em>eenvoudiger.</em></>}</h1>
          <p className="hero-description">{en
            ? 'Share your website. We review how your business comes across and how visitors can contact you. You receive three concrete priorities to discuss or put into practice.'
            : 'Deel je website. We bekijken hoe je bedrijf overkomt en hoe bezoekers je kunnen contacteren. Je krijgt drie concrete prioriteiten om te bespreken of zelf mee aan de slag te gaan.'}</p>
          <div className="hero-actions audit-actions">
            <CTA href="#audit-form">{en ? 'Request my free audit' : 'Vraag mijn gratis websitecheck'}</CTA>
          </div>
          <p className="release-note">{en ? 'For independent businesses and SMEs. Free, with no obligation.' : 'Voor zelfstandigen en kmo’s. Gratis en vrijblijvend.'}</p>
        </div>
        <div className="audit-form-visual" id="audit-form"><InquiryForm lang={lang} kind="audit"/></div>
      </section>
      <section className="inquiry-section container" aria-labelledby="audit-review-title">
        <div className="inquiry-section-copy">
          <p className="eyebrow">{en ? 'WHAT HAPPENS NEXT' : 'ZO GAAT HET VERDER'}</p>
          <h2 id="audit-review-title">{en ? <>Three priorities.<br/><em>One clear next step.</em></> : <>Drie prioriteiten.<br/><em>Een heldere volgende stap.</em></>}</h2>
          <p>{en
            ? 'We contact you by email with our findings. If you would like help making improvements, we discuss the scope and price first. You decide whether to continue.'
            : 'We nemen per e-mail contact op met onze bevindingen. Wil je hulp bij de verbeteringen? Dan bespreken we eerst de inhoud en prijs. Jij beslist of je verdergaat.'}</p>
        </div>
        <aside className="audit-panel" aria-label={en ? 'What we review' : 'Wat we bekijken'}>
          <p className="eyebrow">{en ? 'WHAT WE REVIEW' : 'WAT WE BEKIJKEN'}</p>
          <div className="audit-points">{points.map(point => <p key={point}><CheckCircle2 size={20} aria-hidden="true"/><span>{point}</span></p>)}</div>
        </aside>
      </section>
    </main>
    <Footer lang={lang}/>
  </div>;
}
