import type { Metadata } from 'next';
import SkumicGamePage from '../../../components/skumic/game-page';

export const metadata: Metadata = {
  title: 'Stage Fighters | Skumic Arcade',
  description: 'Vecht met Matar en Gauthier tegen de computer of met twee op één toetsenbord.',
  alternates: { canonical: '/skumic/stage-fighters/' },
  icons: { icon: '/skumic/assets/logo.webp' },
};

export default function StageFightersPage() {
  return <SkumicGamePage title="Stage Fighters" src="https://skumic-meppn-production.up.railway.app/" />;
}
