import type { Metadata } from 'next';
import './globals.css';
import './client-home.css';
export const metadata: Metadata = {
 metadataBase: new URL('https://codeflowstudios.be'),
 title: 'Codeflow Studios — Websites & design voor kmo’s in Brugge',
 description: 'Een heldere website en een vlotte weg naar een offerteaanvraag. Codeflow Studios combineert webdesign en ontwikkeling voor zelfstandigen en kmo’s in Brugge en West-Vlaanderen. Start met een gratis websitecheck.',
 icons: { icon: '/codeflow-logo.png' },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="nl"><body>{children}</body></html>}
