'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
export type Language = 'en' | 'nl';
export const email = 'codeflowstudios@proton.me';
export function useLanguage(initialLang: Language = 'nl') {
  const [lang, set] = useState<Language>(initialLang);
  useEffect(() => { const query = new URLSearchParams(location.search).get('lang'); if (query === 'en' || query === 'nl') { set(query); try { localStorage.setItem('codeflow-language', query); } catch {} } else { try { const saved = localStorage.getItem('codeflow-language'); if (saved === 'en' || saved === 'nl') set(saved); } catch {} } }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (value: Language) => { set(value); try { localStorage.setItem('codeflow-language', value); } catch {} const url = new URL(location.href); url.searchParams.set('lang', value); history.replaceState(null, '', url); };
  return { lang, setLang, en: lang === 'en' };
}
export function Header({lang,setLang,onboarding=false,current}:{lang:Language;setLang:(l:Language)=>void;onboarding?:boolean;current?:'community'}) {
  const en = lang === 'en';
  return <header className="header"><div className="container header-inner"><a className="brand" href={`/?lang=${lang}`} aria-label="Codeflow Studios"><img src="/codeflow-logo.png" alt="Codeflow Studios" width="200" height="200" /></a><nav aria-label={en?'Main navigation':'Hoofdnavigatie'}>{!onboarding && <><a href={`/?lang=${lang}#services`}>{en?'Services':'Diensten'}</a><a href={`/services/rebranding?lang=${lang}`}>Rebranding</a><a href={`/services/software-development?lang=${lang}#game`}>Game</a><a href={`/nightly-build-club?lang=${lang}`} aria-current={current==='community'?'page':undefined}>Community</a><a href={`/?lang=${lang}#contact`}>Contact</a></>}<div className="language" role="group" aria-label={en?'Language':'Taal'}><button onClick={()=>setLang('nl')} aria-pressed={lang==='nl'}>NL</button><span>/</span><button onClick={()=>setLang('en')} aria-pressed={lang==='en'}>EN</button></div>{onboarding?<a className="nav-action" href={`/?lang=${lang}`}>{en?'Back to website':'Naar de website'} <ArrowUpRight size={17}/></a>:<a className="nav-action" href={`/onboarding?plan=flow&lang=${lang}`}>{en?'Explore your flow':'Ontdek jouw flow'} <ArrowUpRight size={17}/></a>}</nav></div></header>;
}
export function Footer({lang}:{lang:Language}) {
 const en=lang==='en';return <footer className="footer container"><div className="footer-top"><span className="footer-name">Codeflow<span> Studios</span></span><a href="#top">{en?'Back to top':'Terug naar boven'} <ArrowUpRight size={18}/></a></div><div className="footer-bottom"><span>© 2026 Codeflow Studios CommV</span><span>{en?'Bruges, Belgium':'Brugge, België'}</span><a href={`/?lang=${lang}`}>codeflowstudios.dev</a></div><p className="domain-list"><a href={`/nightly-build-club?lang=${lang}`}>Nightly Build Club</a> <span>·</span> {en?'A community by Codeflow Studios':'Een community van Codeflow Studios'}</p></footer>;
}
export function CTA({children,href,className=''}:{children:React.ReactNode;href:string;className?:string}){return <a className={`button ${className}`} href={href}>{children}<ArrowRight size={19}/></a>}
