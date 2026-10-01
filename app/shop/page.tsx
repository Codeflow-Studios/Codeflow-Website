import type { Metadata } from 'next';

const shopifyStore = 'https://codeflowshop.myshopify.com';

export const metadata: Metadata = {
  title: 'Flow Shop — Codeflow Studios',
  description: 'Open the Flow Shop by Codeflow Studios.',
  robots: { index: false, follow: true },
};

export default function ShopRedirectPage() {
  return (
    <main className="legal-main container">
      <script dangerouslySetInnerHTML={{ __html: `window.location.replace('${shopifyStore}' + window.location.search);` }} />
      <header className="legal-heading">
        <p className="eyebrow">CODEFLOW STUDIOS / FLOW SHOP</p>
        <h1>Opening Flow Shop…</h1>
        <p>
          <a className="button" href={shopifyStore}>Continue to Flow Shop</a>
        </p>
      </header>
    </main>
  );
}
