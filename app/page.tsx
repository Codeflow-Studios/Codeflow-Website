import Home from '@/components/codeflow/home';
import LanguageLanding from '@/components/codeflow/language-landing';

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { lang: requestedLanguage } = await searchParams;
  const lang = Array.isArray(requestedLanguage)
    ? requestedLanguage[0]
    : requestedLanguage;

  if (lang === 'nl' || lang === 'en') {
    return <Home initialLang={lang} />;
  }

  return <LanguageLanding />;
}
