import type { Metadata } from 'next';
import NightlyBuildClub from '@/components/codeflow/nightly-build-club';

export const metadata: Metadata = {
  title: 'Nightly Build Club — Community by Codeflow Studios',
  description:
    'A community for makers who turn focused evening sessions into real, finished projects. Small sessions. Real builds.',
  alternates: { canonical: 'https://www.codeflowstudios.dev/nightly-build-club' },
};

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

const communitySchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Nightly Build Club',
  url: 'https://www.codeflowstudios.dev/nightly-build-club',
  slogan: 'Small sessions. Real builds.',
  parentOrganization: {
    '@type': 'Organization',
    name: 'Codeflow Studios',
    url: 'https://www.codeflowstudios.dev',
  },
};

export default async function NightlyBuildClubPage({ searchParams }: PageProps) {
  const { lang: requestedLanguage } = await searchParams;
  const requested = Array.isArray(requestedLanguage)
    ? requestedLanguage[0]
    : requestedLanguage;
  const lang = requested === 'en' ? 'en' : 'nl';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(communitySchema) }}
      />
      <NightlyBuildClub initialLang={lang} />
    </>
  );
}
