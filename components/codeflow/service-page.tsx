"use client";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brush,
  Code2,
  Layers3,
  Radio,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Header, Footer, useLanguage } from "./shared";
import Packages, { type Service } from "./packages";
import GameShowcase from "./game-showcase";
import DesignShowcase from "./design-showcase";

const content = {
  marketing: {
    label: "Marketing",
    eyebrow: { nl: "REAL-TIME RELEVANTIE", en: "REAL-TIME RELEVANCE" },
    title: {
      nl: "Marketing die beweegt met jouw markt.",
      en: "Marketing that moves with your market.",
    },
    intro: {
      nl: "We verbinden jouw bedrijf met relevante trends en vertalen die signalen naar een duidelijke marketingrichting, content en campagnes.",
      en: "We connect your business to relevant trends and turn those signals into clear marketing direction, content and campaigns.",
    },
    points: {
      nl: [
        [
          "Realtime signalen",
          "Ontdek welke trends werkelijk passen bij je sector en publiek.",
        ],
        [
          "Strategische vertaling",
          "Van losse aandacht naar merkgerichte content en campagnes.",
        ],
        [
          "Slimme flow",
          "Een schaalbare aanpak met automatisering als fundament.",
        ],
      ],
      en: [
        [
          "Real-time signals",
          "Find trends that genuinely fit your industry and audience.",
        ],
        [
          "Strategic translation",
          "Turn attention into brand-led content and campaigns.",
        ],
        ["A smarter flow", "A scalable approach with automation at its core."],
      ],
    },
  },
  design: {
    label: "Graphic design",
    eyebrow: { nl: "VISUELE IDENTITEIT", en: "VISUAL IDENTITY" },
    title: {
      nl: "Design dat herkenning opbouwt.",
      en: "Design that builds recognition.",
    },
    intro: {
      nl: "Van logo en huisstijl tot digitaal artwork en webdesign: we creëren een visuele taal die klopt op elk relevant contactpunt.",
      en: "From logos and identity systems to digital artwork and web design, we create a visual language that works across every relevant touchpoint.",
    },
    points: {
      nl: [
        ["Merkbasis", "Logo, kleur en typografie met een duidelijke reden."],
        [
          "Digitale toepassingen",
          "Social templates, visuals en interfaces in één lijn.",
        ],
        [
          "Richtlijnen",
          "Een werkbaar systeem waarmee je merk consistent blijft.",
        ],
      ],
      en: [
        [
          "Brand foundations",
          "Logo, colour and typography with a clear purpose.",
        ],
        [
          "Digital applications",
          "Social templates, visuals and interfaces in one system.",
        ],
        ["Guidelines", "A practical system that keeps your brand consistent."],
      ],
    },
  },
  software: {
    label: "Software development",
    eyebrow: { nl: "DIGITALE PRODUCTEN", en: "DIGITAL PRODUCTS" },
    title: {
      nl: "Software gebouwd rond echte noden.",
      en: "Software built around real needs.",
    },
    intro: {
      nl: "We ontwikkelen websites, webapplicaties en software op maat. Functioneel, eigenzinnig en afgestemd op de mensen die ermee werken.",
      en: "We develop websites, web applications and custom software: functional, distinctive and shaped around the people using it.",
    },
    points: {
      nl: [
        [
          "Websites",
          "Responsieve ervaringen die je merk en doelen ondersteunen.",
        ],
        [
          "Webapps",
          "Gerichte toepassingen voor klanten en dagelijkse processen.",
        ],
        ["Maatwerk", "Architectuur en integraties met ruimte om te groeien."],
      ],
      en: [
        ["Websites", "Responsive experiences supporting your brand and goals."],
        ["Web apps", "Focused applications for customers and daily processes."],
        ["Custom software", "Architecture and integrations with room to grow."],
      ],
    },
  },
  rebranding: {
    label: "Rebranding",
    eyebrow: { nl: "HET TOTAALPAKKET", en: "THE COMPLETE PACKAGE" },
    title: {
      nl: "Eén nieuw verhaal. Drie disciplines.",
      en: "One new story. Three disciplines.",
    },
    intro: {
      nl: "Rebranding is onze geïntegreerde aanpak: marketing, grafisch design en softwareontwikkeling werken samen aan één sterke herlancering.",
      en: "Rebranding is our integrated approach: marketing, graphic design and software development work together in one strong relaunch.",
    },
    points: {
      nl: [
        ["Marketing", "Positionering, doelgroep en campagne-aanpak."],
        [
          "Grafisch design",
          "Een herkenbare identiteit en alle nodige toepassingen.",
        ],
        [
          "Software",
          "Een digitale ervaring die het vernieuwde merk waarmaakt.",
        ],
      ],
      en: [
        ["Marketing", "Positioning, audience and campaign direction."],
        [
          "Graphic design",
          "A recognisable identity and the applications it needs.",
        ],
        [
          "Software",
          "A digital experience that delivers on the renewed brand.",
        ],
      ],
    },
  },
} as const;

export default function ServicePage({ service }: { service: Service }) {
  const { lang, setLang, en } = useLanguage();
  const c = content[service];
  const icons =
    service === "marketing"
      ? [Radio, BarChart3, Workflow]
      : service === "design"
        ? [Brush, Sparkles, Layers3]
        : service === "software"
          ? [Code2, Workflow, Layers3]
          : [Radio, Brush, Code2];
  return (
    <div id="top">
      <Header lang={lang} setLang={setLang} />
      <main>
        <section className={`service-hero service-hero-${service}`}>
          <div className="container">
            <a className="service-back" href={`/?lang=${lang}#services`}>
              <ArrowLeft size={17} />
              {en ? "All services" : "Alle diensten"}
            </a>
            <p className="eyebrow">{c.eyebrow[lang]}</p>
            <h1>{c.title[lang]}</h1>
            <p>{c.intro[lang]}</p>
            <a className="button" href="#packages">
              {en ? "View packages" : "Bekijk pakketten"}
              <ArrowRight size={18} />
            </a>
          </div>
        </section>
        <section className="container service-points">
          {c.points[lang].map(([title, description], i) => {
            const Icon = icons[i];
            return (
              <article key={title}>
                <Icon size={28} />
                <span>0{i + 1}</span>
                <h2>{title}</h2>
                <p>{description}</p>
              </article>
            );
          })}
        </section>
        <Packages lang={lang} service={service} standalone />
        {service === "design" && <DesignShowcase lang={lang} />}
        {service === "software" && <GameShowcase lang={lang} />}
        <section className="service-switch container">
          <p>
            {en ? "Explore another discipline" : "Ontdek een andere discipline"}
          </p>
          <div>
            {(["marketing", "design", "software", "rebranding"] as Service[])
              .filter((s) => s !== service)
              .map((s) => (
                <a
                  key={s}
                  href={`/services/${s === "design" ? "graphic-design" : s === "software" ? "software-development" : s}?lang=${lang}`}
                >
                  {s === "design"
                    ? en
                      ? "Graphic design"
                      : "Grafisch design"
                    : s === "software"
                      ? en
                        ? "Software development"
                        : "Softwareontwikkeling"
                      : s[0].toUpperCase() + s.slice(1)}
                  <ArrowRight size={16} />
                </a>
              ))}
          </div>
        </section>
      </main>
      <Footer lang={lang} />
    </div>
  );
}
