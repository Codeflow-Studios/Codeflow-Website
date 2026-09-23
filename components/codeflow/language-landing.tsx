'use client';

/* eslint-disable @next/next/no-html-link-for-pages */
import Image from 'next/image';
import { useState } from 'react';

type LandingLanguage = 'nl' | 'en';

export default function LanguageLanding() {
  const [previewLanguage, setPreviewLanguage] = useState<LandingLanguage>('nl');

  return (
    <main className="language-entry">
      <div className="language-entry-brand">
        <Image
          src="/codeflow-logo.png"
          alt="Codeflow Studios"
          width="200"
          height="200"
          priority
          unoptimized
        />
      </div>

      <section className="language-entry-content" aria-labelledby="language-entry-title">
        <p className="language-entry-label">Creative technology studio</p>
        <h1 id="language-entry-title" lang={previewLanguage}>
          {previewLanguage === 'en' ? (
            <>We help businesses grow with <em>marketing, brand design &amp; custom software.</em></>
          ) : (
            <>Wij helpen bedrijven groeien met <em>marketing, merkdesign &amp; software op maat.</em></>
          )}
        </h1>

        <nav
          className="language-entry-options"
          aria-label="Kies je taal / Choose your language"
          onMouseLeave={() => setPreviewLanguage('nl')}
        >
          <a
            href="/?lang=nl"
            hrefLang="nl"
            onMouseEnter={() => setPreviewLanguage('nl')}
            onFocus={() => setPreviewLanguage('nl')}
          >
            <span>Nederlands</span>
            <span aria-hidden="true">→</span>
          </a>
          <a
            href="/?lang=en"
            hrefLang="en"
            onMouseEnter={() => setPreviewLanguage('en')}
            onFocus={() => setPreviewLanguage('en')}
          >
            <span>English</span>
            <span aria-hidden="true">→</span>
          </a>
        </nav>
      </section>

      <p className="language-entry-location">Bruges, Belgium · Everywhere</p>
    </main>
  );
}
