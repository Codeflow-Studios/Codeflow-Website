'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Home from '@/components/codeflow/home';
import LanguageLanding from '@/components/codeflow/language-landing';

function SelectedLanguage() {
  const lang = useSearchParams().get('lang');
  return lang === 'nl' || lang === 'en'
    ? <Home initialLang={lang} />
    : <LanguageLanding />;
}

export default function Page() {
  return <Suspense fallback={<LanguageLanding />}><SelectedLanguage /></Suspense>;
}
