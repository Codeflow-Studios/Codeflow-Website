'use client';

import { Check } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CTA, type Language } from './shared';

export type Service = 'marketing' | 'design' | 'software' | 'rebranding';
export const serviceLabels: Record<Language, Record<Service, string>> = {
  nl: { marketing: 'Marketing', design: 'Grafisch design', software: 'Websites & software', rebranding: 'Rebranding' },
  en: { marketing: 'Marketing', design: 'Graphic design', software: 'Websites & software', rebranding: 'Rebranding' },
};

type Project = {
  name: string;
  description: string;
  price?: string;
  features: string[];
  note: string;
};

const projects: Record<Language, Record<Service, Project>> = {
  nl: {
    marketing: {
      name: 'Een praktisch marketingplan',
      description: 'Samen bepalen we wie je wil bereiken, wat je vertelt en welke acties eerst komen. Je krijgt een afgebakende opdracht met duidelijke afspraken.',
      features: ['Doelgroep en positionering', 'Een duidelijke boodschap voor je bedrijf', 'Kanaalkeuze en concrete contentrichting', 'Prioriteiten die passen bij je tijd en budget'],
      note: 'Strategie en contentondersteuning worden op maat geoffreerd. Advertentiebudget, contentproductie en eventuele verdere begeleiding spreken we apart af.',
    },
    design: {
      name: 'Een herkenbare eerste indruk',
      price: '450',
      description: 'Een gerichte ontwerpopdracht voor je bedrijf: een nieuw logo of een verfijning van wat er al is, met de bestanden die je nodig hebt.',
      features: ['Logo-ontwerp of logoverfijning', 'Kleuren en typografie', 'Basisbestanden voor digitaal gebruik', 'Een afgesproken aantal feedbackrondes'],
      note: 'Een volledige huisstijl, drukwerk en extra toepassingen offreren we op maat. Omvang, bestandsformaten en gebruiksrechten staan in je offerte.',
    },
    software: {
      name: 'Website + aanvragen',
      price: '2.450',
      description: 'Een heldere website die je werk toont en bezoekers helpt een gerichte aanvraag te doen. Voor zelfstandigen en kleine dienstverlenende bedrijven.',
      features: ['Tot vijf pagina’s in één taal', 'Mobielvriendelijk ontwerp en heldere diensten', 'Aanvraagformulier met automatische ontvangstbevestiging', 'Basisinrichting voor het meten van aanvragen', 'Twee feedbackrondes en overdracht bij oplevering'],
      note: 'Je levert foto’s en projectinformatie aan. Omvang, timing, hosting, licenties en onderhoud spreken we vooraf af in de offerte. Webapps en uitgebreidere koppelingen krijgen een aparte offerte.',
    },
    rebranding: {
      name: 'Een gerichte vernieuwing',
      price: '2.950',
      description: 'Je boodschap, uitstraling en website weer op één lijn. We starten met wat jouw bedrijf nodig heeft en leggen de omvang vooraf vast.',
      features: ['Doelgroep en communicatierichting', 'Een visuele opfrissing', 'Vernieuwing van de afgesproken websiteonderdelen', 'Samenhang tussen je online en visuele communicatie'],
      note: 'Een volledige nieuwe huisstijl, een nieuwe website, campagnes en maatwerksoftware kunnen de omvang vergroten. Alle onderdelen en eventuele externe kosten staan vooraf in je offerte.',
    },
  },
  en: {
    marketing: {
      name: 'A practical marketing plan',
      description: 'Together we define who you want to reach, what to say and which actions come first. You get a focused project with clear deliverables.',
      features: ['Audience and positioning', 'A clear message for your business', 'Channel selection and practical content direction', 'Priorities that fit your time and budget'],
      note: 'Strategy and content support are quoted to your needs. Advertising spend, content production and any ongoing support are agreed separately.',
    },
    design: {
      name: 'A recognisable first impression',
      price: '450',
      description: 'A focused design project for your business: a new logo or a refinement of your existing one, with the files you need.',
      features: ['Logo design or refinement', 'Colours and typography', 'Core files for digital use', 'An agreed number of feedback rounds'],
      note: 'Full visual identities, print design and extra applications are quoted separately. Scope, file formats and usage rights are specified in your proposal.',
    },
    software: {
      name: 'Website + enquiries',
      price: '2,450',
      description: 'A clear website that showcases your work and helps visitors make a relevant enquiry. For independent professionals and small service businesses.',
      features: ['Up to five pages in one language', 'Mobile-friendly design and clear services', 'Enquiry form with automatic acknowledgement', 'Basic enquiry measurement setup', 'Two feedback rounds and a launch handover'],
      note: 'You supply photos and project information. Scope, timing, hosting, licences and maintenance are agreed in your proposal. Web apps and more extensive integrations are quoted separately.',
    },
    rebranding: {
      name: 'A focused refresh',
      price: '2,950',
      description: 'Bring your message, visual identity and website into line. We start with what your business needs and agree the scope before work begins.',
      features: ['Audience and communication direction', 'A visual refresh', 'Updates to agreed parts of your website', 'Consistent online and visual communication'],
      note: 'A full visual identity, a new website, campaigns and custom software can extend the scope. All deliverables and any external costs are set out in your proposal.',
    },
  },
};

export default function Packages({ lang, service, onServiceChange, standalone = false }: {
  lang: Language;
  service: Service;
  onServiceChange?: (value: Service) => void;
  standalone?: boolean;
}) {
  const en = lang === 'en';
  const labels = serviceLabels[lang];
  const project = (key: Service) => {
    const item = projects[lang][key];
    return <div className="homepage-audit-card service-project">
      <div className="homepage-audit-copy">
        <p className="eyebrow">{labels[key]}</p>
        <h2>{item.name}</h2>
        <p>{item.description}</p>
        <div className="package-price">{item.price ? <><span>{en ? 'From' : 'Vanaf'}</span> €{item.price}</> : <span>{en ? 'Tailored quote' : 'Offerte op maat'}</span>}</div>
        {item.price && <p className="price-note">{en ? 'Per project · excl. VAT' : 'Per project · excl. btw'}</p>}
        <CTA href={`/contact?lang=${lang}&service=${key}&package=${encodeURIComponent(item.name)}`}>{en ? 'Discuss my project' : 'Bespreek mijn project'}</CTA>
      </div>
      <div className="homepage-audit-review">
        <p className="eyebrow">{en ? 'WHAT WE WORK ON' : 'WAT WE VOOR JE DOEN'}</p>
        <ul>{item.features.map(feature => <li key={feature}><Check size={20} aria-hidden="true"/><span>{feature}</span></li>)}</ul>
        <p className="homepage-audit-note">{item.note}</p>
      </div>
    </div>;
  };

  return <section className="section container packages" id="packages" aria-label={en ? 'Project scope and pricing' : 'Projectomvang en prijs'}>
    {standalone ? project(service) : <Tabs value={service} onValueChange={value => onServiceChange?.(value as Service)} className="service-tabs">
      <TabsList className="service-tab-list" aria-label={en ? 'Service' : 'Dienst'}>{(Object.keys(labels) as Service[]).map(key => <TabsTrigger value={key} key={key} className="service-tab">{labels[key]}</TabsTrigger>)}</TabsList>
      {(Object.keys(labels) as Service[]).map(key => <TabsContent value={key} key={key}>{project(key)}</TabsContent>)}
    </Tabs>}
    <p className="package-disclaimer">{en ? 'Ask for a quote without obligation. We agree deliverables, timing and the total price before work starts.' : 'Vraag vrijblijvend een offerte aan. We leggen de inhoud, planning en totale prijs vast vóór we starten.'}</p>
  </section>;
}
