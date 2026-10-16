'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Home from '@/components/codeflow/home';

function SelectedLanguage() {
  const lang = useSearchParams().get('lang');
  return <Home initialLang={lang === 'en' ? 'en' : 'nl'} />;
}

export default function Page() {
  return <Suspense fallback={<Home initialLang="nl" />}><SelectedLanguage /></Suspense>;
}
