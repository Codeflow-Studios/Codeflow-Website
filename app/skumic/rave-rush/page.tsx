import type { Metadata } from 'next';
import SkumicGamePage from '../../../components/skumic/game-page';

export const metadata: Metadata = {
  title: 'Rave Rush | Skumic Arcade',
  description: 'Vlieg met Skumic, Gauthier of Matar op de Skumic-soundtrack.',
  alternates: { canonical: '/skumic/rave-rush/' },
  icons: { icon: '/skumic/assets/logo.webp' },
};

export default function RaveRushPage() {
  return <SkumicGamePage title="Rave Rush" src="https://codeflow-studios-production.up.railway.app/games/bluvn-goan/" />;
}
