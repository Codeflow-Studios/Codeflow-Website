import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Rave Rush | Codeflow Studios',
  description: 'Een muzikale arcadegame met Skumic, Gauthier en Matar. Vlieg, ontwijk en pak tien seconden bescherming op de drops van Puber.',
};
export default function BluvnGoanPage() {
  const gameUrl = process.env.SITEGROUND_STATIC_EXPORT === '1'
    ? 'https://codeflow-studios-production.up.railway.app/games/bluvn-goan/index.html'
    : '/games/bluvn-goan/index.html';
  return <main style={{ position:'fixed',inset:0,width:'100vw',height:'100dvh',background:'#020105' }}>
    <iframe src={gameUrl} title="Rave Rush" allow="autoplay; fullscreen" allowFullScreen style={{width:'100%',height:'100%',border:0,display:'block'}} />
  </main>;
}
