'use client';

import { Header, Footer, useLanguage } from './shared';
import InquiryForm from './inquiry-form';

export default function Contact() {
  const { lang, setLang, en } = useLanguage();
  return <div id="top"><Header lang={lang} setLang={setLang}/><main>
    <section className="contact-page-layout container">
      <div className="contact-page-copy"><p className="eyebrow">{en ? 'YOUR NEXT STEP STARTS HERE' : 'JOUW VOLGENDE STAP BEGINT HIER'}</p>
        <h1>{en ? <>Good ideas<br/>deserve <em>flow.</em></> : <>Goede ideeën<br/>verdienen <em>flow.</em></>}</h1>
        <p>{en ? 'A new website, a stronger brand or a question about a package? Tell us what you have in mind.' : 'Een nieuwe website, een sterker merk of een vraag over een pakket? Vertel ons wat je voor ogen hebt.'}</p>
        <div className="contact-page-points"><p>01 / {en ? 'Share your idea' : 'Deel je idee'}</p><p>02 / {en ? 'We look at what you need' : 'We bekijken wat je nodig hebt'}</p><p>03 / {en ? 'A clear next step, together' : 'Samen een duidelijke volgende stap'}</p></div>
      </div><InquiryForm lang={lang}/>
    </section>
  </main><Footer lang={lang}/></div>;
}
