import type { Metadata } from 'next';
import DropOne from '@/components/codeflow/drop-one';
import './drop-one.css';
export const metadata: Metadata = {
 title:'Drop 1 — Graphic T-shirts | Codeflow Studios',
 description:'Go with the flow. Ontdek vijf Codeflow Studios graphic tees: Liquid, Orbit, Momentum, Breath en Current. Shop Drop 1 in Flow Shop.',
 alternates:{canonical:'https://www.codeflowstudios.be/drop-1/'},
 openGraph:{title:'Drop 1 is live — Go with the flow.',description:'Five graphic tees. One creative flow. Discover the first Codeflow Studios drop.',url:'https://www.codeflowstudios.be/drop-1/',images:[{url:'https://www.codeflowstudios.be/drop-1/share.jpg',width:1200,height:630,alt:'Codeflow Studios Drop 1 graphic T-shirts'}]},
 twitter:{card:'summary_large_image',title:'Drop 1 is live — Codeflow Studios',images:['https://www.codeflowstudios.be/drop-1/share.jpg']}
};
export default function Page(){return <DropOne initialLang="nl"/>;}
