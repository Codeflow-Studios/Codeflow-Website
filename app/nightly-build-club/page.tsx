import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flow Community — Codeflow Studios',
  description: 'Nightly Build Club is now Flow Community.',
  alternates: { canonical: '/flow-community/' },
  robots: { index: false, follow: true },
};

export default function NightlyBuildClubMovedPage() {
  return (
    <main className="legal-main container">
      <script dangerouslySetInnerHTML={{ __html: "window.location.replace('/flow-community/' + window.location.search);" }} />
      <header className="legal-heading">
        <p className="eyebrow">COMMUNITY / MOVED</p>
        <h1>Nightly Build Club is now Flow Community.</h1>
        <p>
          <a className="button" href="/flow-community/">Open Flow Community</a>
        </p>
      </header>
    </main>
  );
}
