'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Menu } from 'lucide-react';
export type Language = 'en' | 'nl';
export const email = 'codeflowstudios@proton.me';
export const shopUrl = 'https://shop.codeflowstudios.be';
export function useLanguage(initialLang: Language = 'nl') {
  const [lang, set] = useState<Language>(initialLang);
  useEffect(() => { const query = new URLSearchParams(location.search).get('lang'); if (query === 'en' || query === 'nl') { set(query); try { localStorage.setItem('codeflow-language', query); } catch {} } else { try { const saved = localStorage.getItem('codeflow-language'); if (saved === 'en' || saved === 'nl') set(saved); } catch {} } }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (value: Language) => { set(value); try { localStorage.setItem('codeflow-language', value); } catch {} const url = new URL(location.href); url.searchParams.set('lang', value); history.replaceState(null, '', url); };
  return { lang, setLang, en: lang === 'en' };
}
export function Header({lang,setLang,onboarding=false,current}:{lang:Language;setLang:(l:Language)=>void;onboarding?:boolean;current?:'community'}) {
  const en = lang === 'en';
  const links = onboarding ? [] : [
    {label:en?'Services':'Diensten',href:`/?lang=${lang}#services`},
    {label:'Rebranding',href:`/services/rebranding?lang=${lang}`},
    {label:'Games',href:`/services/software-development?lang=${lang}#game`},
    {label:'Flow Community',href:`/flow-community?lang=${lang}`,community:true},
    {label:'Flow Shop',href:shopUrl,external:true},
    {label:'Contact',href:`/?lang=${lang}#contact`},
  ];
  const action = onboarding
    ? {href:`/?lang=${lang}`,label:en?'Back to website':'Naar de website'}
    : {href:`/onboarding?plan=flow&lang=${lang}`,label:en?'Explore your flow':'Ontdek jouw flow'};
  const languageSwitch = <div className="language" role="group" aria-label={en?'Language':'Taal'}><button onClick={()=>setLang('nl')} aria-pressed={lang==='nl'}>NL</button><span>/</span><button onClick={()=>setLang('en')} aria-pressed={lang==='en'}>EN</button></div>;
  const linkElements = links.map((link)=><a key={link.label} className={link.external?'flow-shop-link':link.community?'flow-community-link':undefined} href={link.href} target={link.external?'_blank':undefined} rel={link.external?'noreferrer':undefined} aria-current={link.community&&current==='community'?'page':undefined} aria-label={link.external?`${link.label} (${en?'opens in a new tab':'opent in een nieuw tabblad'})`:undefined}>{link.label}{link.external&&<ArrowUpRight size={14} aria-hidden="true"/>}</a>);
  return <header className="header"><div className="container header-inner"><a className="brand" href={`/?lang=${lang}`} aria-label="Codeflow Studios"><img src="/codeflow-logo.png" alt="Codeflow Studios" width="200" height="200" /></a><nav className="desktop-navigation" aria-label={en?'Main navigation':'Hoofdnavigatie'}>{linkElements}{languageSwitch}<a className="nav-action" href={action.href}>{action.label} <ArrowUpRight size={17}/></a></nav><details className="mobile-navigation"><summary><Menu size={20} aria-hidden="true"/><span>Menu</span></summary><div className="mobile-menu-panel" role="navigation" aria-label={en?'Mobile navigation':'Mobiele navigatie'}><div className="mobile-menu-links">{linkElements}</div><div className="mobile-menu-footer">{languageSwitch}<a className="nav-action" href={action.href}>{action.label} <ArrowUpRight size={17}/></a></div></div></details></div></header>;
}
export function Footer({lang}:{lang:Language}) {
 const en=lang==='en';return <footer className="footer container"><div className="footer-top"><span className="footer-name">Codeflow<span> Studios</span></span><a href="#top">{en?'Back to top':'Terug naar boven'} <ArrowUpRight size={18}/></a></div><div className="footer-bottom"><span>© 2026 Codeflow Studios CommV</span><span>BE 1026.498.540</span><a href={`/legal?lang=${lang}`}>{en?'Legal':'Bedrijfsgegevens'}</a><a href={`/flow-community?lang=${lang}`}>Flow Community</a><a href={shopUrl} target="_blank" rel="noreferrer">Flow Shop</a><span>codeflowstudios.be</span></div><p className="domain-list">codeflowstudios.be <span>·</span> codeflowstudios.eu <span>·</span> codeflowstudios.net <span>·</span> codeflowstudios.org</p></footer>;
}
export function CTA({children,href,className=''}:{children:React.ReactNode;href:string;className?:string}){return <a className={`button ${className}`} href={href}>{children}<ArrowRight size={19}/></a>}
