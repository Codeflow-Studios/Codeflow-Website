import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
 metadataBase: new URL('https://codeflowstudios.be'),
 title: 'Codeflow Studios — Trend-driven marketing & creative technology',
 description: 'Codeflow Studios CommV, Bruges. Automated marketing shaped by real-time trends, rebranding, graphic design, web design and custom software.',
 icons: { icon: '/codeflow-logo.png' },
};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="nl"><body>{children}</body></html>}
