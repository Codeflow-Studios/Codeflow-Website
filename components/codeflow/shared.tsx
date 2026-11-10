'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Menu } from 'lucide-react';
export type Language = 'en' | 'nl';
export const email = 'info@codeflowstudios.be';
export const shopUrl = '/shop/';
export function useLanguage(initialLang: Language = 'nl') {
  const [lang, set] = useState<Language>(initialLang);
  useEffect(() => { const query = new URLSearchParams(location.search).get('lang'); if (query === 'en' || query === 'nl') { set(query); try { localStorage.setItem('codeflow-language', query); } catch {} } else { try { const saved = localStorage.getItem('codeflow-language'); if (saved === 'en' || saved === 'nl') set(saved); } catch {} } }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (value: Language) => { set(value); try { localStorage.setItem('codeflow-language', value); } catch {} const url = new URL(location.href); url.searchParams.set('lang', value); history.replaceState(null, '', url); };
  return { lang, setLang, en: lang === 'en' };
}
export function Header({lang,setLang,onboarding=false}:{lang:Language;setLang:(l:Language)=>void;onboarding?:boolean;current?:'community'}) {
  const en = lang === 'en';
  const links = onboarding ? [] : [
    {label:en?'Offer':'Aanbod',href:`/?lang=${lang}#services`},
    {label:en?'Work':'Werk',href:`/?lang=${lang}#work`},
    {label:'Contact',href:`/?lang=${lang}#contact`},
  ];
  const action = onboarding
    ? {href:`/?lang=${lang}`,label:en?'Back to website':'Naar de website'}
    : {href:`/free-audit?lang=${lang}`,label:en?'Free website audit':'Gratis websitecheck'};
  const languageSwitch = <div className="language" role="group" aria-label={en?'Language':'Taal'}><button onClick={()=>setLang('nl')} aria-pressed={lang==='nl'}>NL</button><span>/</span><button onClick={()=>setLang('en')} aria-pressed={lang==='en'}>EN</button></div>;
  const linkElements = links.map((link)=><a key={link.label} href={link.href} onClick={event=>event.currentTarget.closest('details')?.removeAttribute('open')}>{link.label}</a>);
  return <header className="header"><div className="container header-inner"><a className="brand" href={`/?lang=${lang}`} aria-label="Codeflow Studios"><img src="/codeflow-logo.png" alt="Codeflow Studios" width="200" height="200" /></a><nav className="desktop-navigation" aria-label={en?'Main navigation':'Hoofdnavigatie'}>{linkElements}{languageSwitch}<a className="nav-action" href={action.href}>{action.label} <ArrowUpRight size={17}/></a></nav><div className="mobile-header-controls">{languageSwitch}<details className="mobile-navigation"><summary><Menu size={20} aria-hidden="true"/><span>Menu</span></summary><div className="mobile-menu-panel" role="navigation" aria-label={en?'Mobile navigation':'Mobiele navigatie'}><div className="mobile-menu-links">{linkElements}</div><div className="mobile-menu-footer"><a className="nav-action" href={action.href}>{action.label} <ArrowUpRight size={17}/></a></div></div></details></div></div></header>;
}
export function Footer({lang}:{lang:Language}) {
 const en=lang==='en';
 return <footer className="footer container">
   <div className="footer-top"><span className="footer-name">Codeflow<span> Studios</span></span><a href="#top">{en?'Back to top':'Terug naar boven'} <ArrowUpRight size={18}/></a></div>
   <nav className="footer-bottom" aria-label={en?'More services':'Andere diensten'}>
     <span>{en?'More services':'Andere diensten'}</span>
     <a href={`/services/software-development?lang=${lang}`}>Websites &amp; software</a>
     <a href={`/services/graphic-design?lang=${lang}`}>{en?'Graphic design':'Grafisch design'}</a>
     <a href={`/services/marketing?lang=${lang}`}>Marketing</a>
     <a href={`/services/rebranding?lang=${lang}`}>Rebranding</a>
   </nav>
   <nav className="footer-bottom" aria-label={en?'Explore the studio':'Ontdek de studio'}>
     <span>{en?'Explore the studio':'Ontdek de studio'}</span>
     <a href={`/services/software-development?lang=${lang}#game`}>Games</a>
     <a href={`/flow-community?lang=${lang}`}>Flow Community</a>
     <a href={shopUrl}>Flow Shop</a>
     <a href={`/drop-1/?lang=${lang}`}>Drop 1</a>
   </nav>
   <div className="footer-bottom"><span>© 2026 Codeflow Studios CommV</span><span>BE 1026.498.540</span><a href={`/legal?lang=${lang}`}>{en?'Company details':'Bedrijfsgegevens'}</a><span>{en?'Bruges, Belgium':'Brugge, België'}</span></div>
 </footer>;
}
export function CTA({children,href,className=''}:{children:React.ReactNode;href:string;className?:string}){return <a className={`button ${className}`} href={href}>{children}<ArrowRight size={19}/></a>}
