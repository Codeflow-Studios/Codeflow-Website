import type { MetadataRoute } from 'next';

const origin = 'https://www.codeflowstudios.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${origin}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${origin}/nightly-build-club`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${origin}/services/marketing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/services/graphic-design`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/services/software-development`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/services/rebranding`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${origin}/skumic`, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
