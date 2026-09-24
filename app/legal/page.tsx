import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Legal & Company Information — Codeflow Studios',
  description: 'Official company information for Codeflow Studios CommV.',
};

export default function LegalPage() {
  return (
    <div className="legal-page" id="top">
      <main className="legal-main container">
        <a className="legal-back" href="/">
          <ArrowLeft size={17} />
          Back to Codeflow Studios
        </a>

        <header className="legal-heading">
          <p className="eyebrow">LEGAL / COMPANY INFORMATION</p>
          <h1>Codeflow Studios CommV</h1>
          <p>
            Official company and contact information for Codeflow Studios CommV,
            a Belgian company based in Bruges.
          </p>
        </header>

        <dl className="legal-details">
          <div className="legal-row">
            <dt>Company</dt>
            <dd>Codeflow Studios CommV</dd>
          </div>
          <div className="legal-row">
            <dt>Country</dt>
            <dd>Belgium</dd>
          </div>
          <div className="legal-row">
            <dt>Enterprise number</dt>
            <dd>1026.498.540</dd>
          </div>
          <div className="legal-row">
            <dt>VAT</dt>
            <dd>BE 1026.498.540</dd>
          </div>
          <div className="legal-row">
            <dt>Registered office</dt>
            <dd>Sint-Gillisdorpstraat 40, 8000 Brugge, Belgium</dd>
          </div>
          <div className="legal-row">
            <dt>Email</dt>
            <dd><a href="mailto:codeflowstudios@proton.me">codeflowstudios@proton.me</a></dd>
          </div>
          <div className="legal-row">
            <dt>Phone</dt>
            <dd><a href="tel:+32480667519">+32 480 66 75 19</a></dd>
          </div>
          <div className="legal-row">
            <dt>Website</dt>
            <dd>
              <a href="https://www.codeflowstudios.be">codeflowstudios.be</a>
              {' · '}
              <a href="https://www.codeflowstudios.eu">codeflowstudios.eu</a>
              {' · '}
              <a href="https://www.codeflowstudios.net">codeflowstudios.net</a>
              {' · '}
              <a href="https://www.codeflowstudios.org">codeflowstudios.org</a>
            </dd>
          </div>
        </dl>

        <p className="legal-note">
          These details identify the business responsible for this website and its services.
        </p>
      </main>
    </div>
  );
}
