import type { Metadata } from 'next';
import FlowCommunity from '@/components/codeflow/flow-community';

export const metadata: Metadata = {
  title: 'Flow Community — Forum & Discord by Codeflow Studios',
  description: 'A web forum and live Discord community for developers, designers, founders and independent makers who want useful feedback and visible progress.',
  alternates: { canonical: '/flow-community/' },
  openGraph: {
    title: 'Flow Community — Share the work. Build the flow.',
    description: 'Searchable build logs and project reviews on the web, with live coworking and conversation on Discord.',
    url: '/flow-community/',
    siteName: 'Codeflow Studios',
    type: 'website',
  },
};

const communitySchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Flow Community',
  url: 'https://codeflowstudios.be/flow-community/',
  description: 'A web forum and live Discord community for developers, designers, founders and independent makers.',
  parentOrganization: {
    '@type': 'Organization',
    name: 'Codeflow Studios CommV',
    url: 'https://codeflowstudios.be/',
  },
};

export default function FlowCommunityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(communitySchema) }}
      />
      <FlowCommunity />
    </>
  );
}
