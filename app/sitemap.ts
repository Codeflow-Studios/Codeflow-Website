import type { MetadataRoute } from 'next';

const baseUrl = 'https://codeflowstudios.be';
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/flow-community/',
    '/services/marketing/',
    '/services/graphic-design/',
    '/services/software-development/',
    '/services/rebranding/',
    '/legal/',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route || '/'}`,
    changeFrequency: route === '/flow-community/' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/flow-community/' ? 0.9 : 0.7,
  }));
}
