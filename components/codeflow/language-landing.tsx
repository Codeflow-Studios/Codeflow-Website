import Image from 'next/image';
import Link from 'next/link';

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
        />
      </div>

      <section className="language-entry-content" aria-labelledby="language-entry-title">
        <p className="language-entry-label">Creative technology studio</p>
        <h1 id="language-entry-title">
          Marketing, design &amp; software
          <br />
          <em>— one studio.</em>
        </h1>

        <nav className="language-entry-options" aria-label="Kies je taal / Choose your language">
          <Link href={{ pathname: '/', query: { lang: 'nl' } }} hrefLang="nl">
            <span>Nederlands</span>
            <span aria-hidden="true">→</span>
          </Link>
          <Link href={{ pathname: '/', query: { lang: 'en' } }} hrefLang="en">
            <span>English</span>
            <span aria-hidden="true">→</span>
          </Link>
        </nav>
      </section>

      <p className="language-entry-location">Bruges, Belgium · Everywhere</p>
    </main>
  );
}
