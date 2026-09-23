import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://www.codeflowstudios.dev/sitemap.xml',
    host: 'https://www.codeflowstudios.dev',
  };
}
