'use client';
import { Check } from 'lucide-react';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
import { CTA,email,type Language } from './shared';
export type Service = 'marketing'|'design'|'software'|'rebranding';
type Package={id:string;name:string;tag:string;desc:string;features:string[]};
const startingPrices:Record<string,string>={
 'design-essentials':'450','design-identity':'950','design-signature':'1.750+',
 spark:'395',flow:'795',scale:'1.495+',
 'software-web':'1.750+','software-app':'4.500+','software-platform':'9.500+',
 'rebranding-refresh':'2.950+','rebranding-relaunch':'5.950+','rebranding-transform':'10.500+'
};
export const serviceLabels:Record<Language,Record<Service,string>>={nl:{marketing:'Marketing',design:'Grafisch design',software:'Softwareontwikkeling',rebranding:'Rebranding'},en:{marketing:'Marketing',design:'Graphic design',software:'Software development',rebranding:'Rebranding'}};
const catalog:Record<Language,Record<Service,Package[]>>={
 nl:{
 marketing:[
 {id:'spark',name:'Spark',tag:'Leg je fundament',desc:'Een gerichte start voor bedrijven die hun marketingrichting zoeken.',features:['Bedrijfs- en doelgroepprofiel','Basis voor jouw merkstem','Gerichte kanaalstrategie']},
 {id:'flow',name:'Flow',tag:'Vind je ritme',desc:'Voor bedrijven die hun marketing willen verbinden met relevante trends.',features:['Alles uit Spark','Trendrelevantie en contentrichting','Samenhangende campagneplanning']},
 {id:'scale',name:'Scale',tag:'Denk een stap groter',desc:'Een bredere marketingaanpak voor meerdere doelgroepen en markten.',features:['Alles uit Flow','Meerdere doelgroepen en markten','Marketingworkflows op maat']}
 ],
 design:[
 {id:'design-essentials',name:'Essentials',tag:'Een herkenbare eerste indruk',desc:'Een gerichte ontwerpopdracht voor de visuele basis van je bedrijf.',features:['Logo-ontwerp of logoverfijning','Kleuren en typografie','Basisbestanden voor digitaal gebruik']},
 {id:'design-identity',name:'Identity',tag:'Een samenhangende huisstijl',desc:'Een visuele identiteit die werkt op je belangrijkste contactpunten.',features:['Logo, kleuren en typografie','Visitekaartje en social templates','Beknopte huisstijlgids']},
 {id:'design-signature',name:'Signature',tag:'Een eigen visuele wereld',desc:'Uitgebreid grafisch design voor merken met meer visuele toepassingen.',features:['Uitgebreide visuele identiteit','Campagnevisuals en digitaal artwork','Webdesign en visuele richtlijnen']}
 ],
 software:[
 {id:'software-web',name:'Web',tag:'Je bedrijf online',desc:'Een website op maat van je bedrijf, je content en je bezoekers.',features:['Responsieve websiteontwikkeling','Pagina’s en functies op maat','Technische oplevering']},
 {id:'software-app',name:'App',tag:'Een toepassing die voor je werkt',desc:'Een gerichte webapplicatie voor jouw klanten of dagelijkse werking.',features:['Functionele analyse','Webapp met afgesproken kernfuncties','Koppelingen met bestaande systemen']},
 {id:'software-platform',name:'Platform',tag:'Ruimte om door te groeien',desc:'Maatwerksoftware voor uitgebreidere processen en digitale producten.',features:['Softwarearchitectuur op maat','Meerdere modules en integraties','Uitrol- en onderhoudsplan']}
 ],
 rebranding:[
 {id:'rebranding-refresh',name:'Refresh',tag:'Een nieuwe start op drie fronten',desc:'Een gerichte vernieuwing van je marketing, grafisch design en digitale basis.',features:['Marketing: doelgroep en kanaalrichting','Grafisch design: visuele opfrissing','Software: vernieuwing van je website']},
 {id:'rebranding-relaunch',name:'Relaunch',tag:'Een compleet nieuw hoofdstuk',desc:'Een samenhangende herlancering waarin alle drie de disciplines samenwerken.',features:['Marketing: strategie en campagneplan','Grafisch design: volledige huisstijl','Software: nieuwe website en koppelingen']},
 {id:'rebranding-transform',name:'Transform',tag:'Het totaalpakket op maat',desc:'Een brede transformatie van je marktbenadering, merkidentiteit en software.',features:['Marketing: aanpak voor meerdere markten','Grafisch design: identiteit en toepassingen','Software: maatwerkapp of platform']}
 ]
 },
 en:{
 marketing:[
 {id:'spark',name:'Spark',tag:'Build your foundation',desc:'A focused start for a business finding its marketing direction.',features:['Company & audience profile','Brand voice foundation','Focused channel strategy']},
 {id:'flow',name:'Flow',tag:'Find your momentum',desc:'For businesses ready to connect their marketing to relevant trends.',features:['Everything in Spark','Trend relevance & content direction','Connected campaign planning']},
 {id:'scale',name:'Scale',tag:'Make room for more',desc:'A broader marketing approach for multiple audiences and markets.',features:['Everything in Flow','Multiple audiences & markets','Custom marketing workflows']}
 ],
 design:[
 {id:'design-essentials',name:'Essentials',tag:'A recognisable first impression',desc:'A focused design project for the visual foundations of your business.',features:['Logo design or refinement','Colours and typography','Core assets for digital use']},
 {id:'design-identity',name:'Identity',tag:'A coherent visual identity',desc:'A visual identity that works across your most important touchpoints.',features:['Logo, colours and typography','Business card and social templates','Concise brand guidelines']},
 {id:'design-signature',name:'Signature',tag:'A visual world of your own',desc:'Extended graphic design for brands with broader visual needs.',features:['Extended visual identity','Campaign visuals and digital artwork','Web design and visual guidelines']}
 ],
 software:[
 {id:'software-web',name:'Web',tag:'Your business online',desc:'A website built around your business, content and visitors.',features:['Responsive website development','Tailored pages and functionality','Technical handover']},
 {id:'software-app',name:'App',tag:'An application that works for you',desc:'A focused web application for your customers or daily operations.',features:['Functional analysis','Web app with agreed core features','Connections to existing systems']},
 {id:'software-platform',name:'Platform',tag:'Room to grow',desc:'Custom software for more complex processes and digital products.',features:['Tailored software architecture','Multiple modules and integrations','Rollout and maintenance plan']}
 ],
 rebranding:[
 {id:'rebranding-refresh',name:'Refresh',tag:'A fresh start on three fronts',desc:'A focused refresh of your marketing, graphic design and digital foundations.',features:['Marketing: audience and channel direction','Graphic design: visual refresh','Software: website refresh']},
 {id:'rebranding-relaunch',name:'Relaunch',tag:'A complete new chapter',desc:'A coordinated relaunch bringing all three disciplines together.',features:['Marketing: strategy and campaign plan','Graphic design: complete visual identity','Software: new website and integrations']},
 {id:'rebranding-transform',name:'Transform',tag:'The complete tailored package',desc:'A broad transformation of your marketing approach, identity and software.',features:['Marketing: approach for multiple markets','Graphic design: identity and applications','Software: custom app or platform']}
 ]
 }
};
export default function Packages({lang,service,onServiceChange,standalone=false}:{lang:Language;service:Service;onServiceChange?:(v:Service)=>void;standalone?:boolean}){
 const en=lang==='en',labels=serviceLabels[lang];
 const descriptions:Record<Service,string>=en?{
 marketing:'Trend-driven marketing subscriptions. Explore the company intake for your future marketing strategy.',
 design:'Standalone graphic design packages for your visual identity, artwork and design assets.',
 software:'Standalone development packages for websites, web applications and custom software.',
 rebranding:'The complete package: marketing + graphic design + software development. Every rebranding package includes all three.'
 }:{
 marketing:'Abonnementen voor marketing op basis van trends. Ontdek de bedrijfsintake voor jouw toekomstige marketingstrategie.',
 design:'Aparte pakketten voor grafisch design: je visuele identiteit, artwork en ontwerpmateriaal.',
 software:'Aparte ontwikkelpakketten voor websites, webapplicaties en software op maat.',
 rebranding:'Het totaalpakket: marketing + grafisch design + softwareontwikkeling. Elk rebrandingpakket omvat alle drie.'
 };
 const category=(key:Service)=><><div className="package-category"><h3>{labels[key]}</h3><p>{descriptions[key]}</p></div><div className="package-grid">{catalog[lang][key].map((p,i)=><article className={`package ${i===1?'featured':''}`} key={p.id}><div className="package-top"><span>0{i+1}</span><span>{key==='rebranding'?(en?'ALL THREE DISCIPLINES':'ALLE DRIE DE DISCIPLINES'):(en?'CONCEPT PACKAGE':'CONCEPTPAKKET')}</span></div><h3>{p.name}</h3><p className="package-tag">{p.tag}</p><div className="package-price"><span>{en?'From':'Vanaf'}</span> €{startingPrices[p.id]} <span>{key==='marketing'?(en?'/ month':'/ maand'):(en?'/ project':'/ project')}</span></div><p className="price-note">{en?'Excl. VAT':'Excl. btw'}</p><p className="package-description">{p.desc}</p><ul>{p.features.map(f=><li key={f}><Check size={17}/>{f}</li>)}</ul><CTA className={i===1?'':'button-outline'} href={key==='marketing'?`/onboarding?plan=${p.id}&lang=${lang}`:`mailto:${email}?subject=${encodeURIComponent(`${labels[key]} — ${p.name}`)}&body=${encodeURIComponent(en?`I would like to discuss the ${p.name} package for ${labels[key].toLowerCase()}.`:`Ik wil graag het pakket ${p.name} voor ${labels[key].toLowerCase()} bespreken.`)}`}>{key==='marketing'?(en?`Explore ${p.name}`:`Ontdek ${p.name}`):(en?'Discuss this package':'Bespreek dit pakket')}</CTA></article>)}</div><p className="package-foot">{key==='marketing'?(en?'Onboarding preview · No card required · Subscriptions are not active yet':'Voorbeeld van de onboarding · Geen betaalkaart nodig · Abonnementen zijn nog niet actief'):key==='rebranding'?(en?'Project scope and pricing by agreement · Any ongoing marketing subscription is specified separately in your quote':'Projectomvang en prijs in overleg · Een doorlopend marketingabonnement wordt afzonderlijk in je offerte uitgewerkt'):(en?'Project scope and pricing by agreement · Your email app opens to discuss the package':'Projectomvang en prijs in overleg · Je mailprogramma opent om het pakket te bespreken')}</p></>;
 return <section className="section container packages" id="packages"><div className="section-heading"><div><p className="eyebrow">03 / {en?'YOUR SERVICE. YOUR PACKAGE.':'JOUW DIENST. JOUW PAKKET.'}</p><h2>{standalone?labels[service]:(en?<>Choose a discipline.<br/><span>Or bring all three together.</span></>:<>Kies jouw expertise.<br/><span>Of combineer ze alle drie.</span></>)}</h2></div><p className="section-intro">{standalone?descriptions[service]:(en?'Marketing, graphic design and software development each have their own packages. Rebranding combines all three in one complete approach.':'Marketing, grafisch design en softwareontwikkeling hebben elk hun eigen pakketten. Rebranding combineert de drie in één totaalaanpak.')}</p></div>
 {standalone?category(service):<Tabs value={service} onValueChange={v=>onServiceChange?.(v as Service)} className="service-tabs"><TabsList className="service-tab-list" aria-label={en?'Package category':'Pakketcategorie'}>{(Object.keys(labels) as Service[]).map(key=><TabsTrigger value={key} key={key} className="service-tab">{labels[key]}</TabsTrigger>)}</TabsList>{(Object.keys(labels) as Service[]).map(key=><TabsContent value={key} key={key}>{category(key)}</TabsContent>)}</Tabs>}
 <p className="package-disclaimer">{en?'All packages are provisional proposals. Final deliverables and pricing will be agreed before starting.':'Alle pakketten zijn voorlopige voorstellen. De definitieve inhoud en prijs worden vóór de start afgesproken.'}</p></section>;
}
