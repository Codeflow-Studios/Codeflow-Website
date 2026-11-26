import type { Metadata } from 'next';
import SkumicGamePage from '../../../components/skumic/game-page';

export const metadata: Metadata = {
  title: 'Skumic Fighters | Skumic Arcade',
  description: 'De 32-bit browserfighter met Matar en Gauthier.',
  alternates: { canonical: '/skumic/fighters/' },
  icons: { icon: '/skumic/assets/logo.webp' },
};

export default function FightersPage() {
  const src = process.env.SITEGROUND_STATIC_EXPORT === '1'
    ? 'https://codeflow-studios-production.up.railway.app/skumic-game/index.html'
    : '/skumic-game/index.html';
  return <SkumicGamePage title="Skumic Fighters" src={src} />;
}
