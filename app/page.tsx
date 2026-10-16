import Home from '@/components/codeflow/home';

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { lang: requestedLanguage } = await searchParams;
  const lang = Array.isArray(requestedLanguage)
    ? requestedLanguage[0]
    : requestedLanguage;

  return <Home initialLang={lang === 'en' ? 'en' : 'nl'} />;
}
