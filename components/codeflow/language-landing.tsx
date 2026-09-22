/* eslint-disable @next/next/no-html-link-for-pages */
import Image from 'next/image';

export default function LanguageLanding() {
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
        <h1 id="language-entry-title">
          We help businesses grow with{' '}
          <em>marketing, brand design &amp; custom software.</em>
        </h1>

        <nav className="language-entry-options" aria-label="Kies je taal / Choose your language">
          <a href="/?lang=nl" hrefLang="nl">
            <span>Nederlands</span>
            <span aria-hidden="true">→</span>
          </a>
          <a href="/?lang=en" hrefLang="en">
            <span>English</span>
            <span aria-hidden="true">→</span>
          </a>
        </nav>
      </section>

      <p className="language-entry-location">Bruges, Belgium · Everywhere</p>
    </main>
  );
}
