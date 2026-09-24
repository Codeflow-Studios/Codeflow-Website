import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const brands = new Map();
const trendsByBrand = new Map();
const campaigns = new Map();

function json(response, status, value) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
  });
  response.end(JSON.stringify(value));
}

async function body(request) {
  let data = '';
  for await (const chunk of request) {
    data += chunk;
    if (data.length > 65536) throw new Error('Request is too large.');
  }
  return JSON.parse(data || '{}');
}

function brandTrends(brand) {
  const existing = trendsByBrand.get(brand.id);
  if (existing) return existing;
  const options = [
    {
      title: `Wat ${brand.targetAudience} verwachten van ${brand.industry}`,
      summary: `Testsignaal op basis van de doelgroep en het aanbod van ${brand.businessName}.`,
      score: 96,
    },
    {
      title: `Laat zien hoe ${brand.businessName} helpt`,
      summary: `Testsignaal rond ${brand.productsAndServices}.`,
      score: 91,
    },
    {
      title: `Maak de volgende stap eenvoudig`,
      summary: `Testsignaal op basis van je oproep tot actie: ${brand.callToAction}.`,
      score: 87,
    },
  ].map((entry) => ({
    trend: {
      id: randomUUID(), provider: 'customer-profile', title: entry.title,
      summary: entry.summary, keywords: [],
    },
    score: { score: entry.score, explanation: 'Voorbeeld op basis van de ingevulde testgegevens.' },
  }));
  trendsByBrand.set(brand.id, options);
  return options;
}

function campaignView(entry) {
  return {
    campaign: entry.campaign,
    brand: entry.brand,
    trend: entry.trend,
    publishingJobs: entry.publishingJobs,
  };
}

export function startStagingMarketingApi(port = 5080) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    const path = url.pathname.replace(/\/$/, '') || '/';

    try {
      if (request.method === 'GET' && path === '/health/ready') {
        json(response, 200, { status: 'ready', mode: 'test-demo' });
        return;
      }
      if (request.method === 'POST' && path === '/api/brands') {
        const input = await body(request);
        const required = ['businessName', 'industry', 'targetAudience', 'productsAndServices', 'callToAction'];
        if (required.some((key) => !String(input[key] || '').trim())) {
          json(response, 400, { title: 'Vul de verplichte merkgegevens in.' });
          return;
        }
        const brand = { ...input, id: randomUUID() };
        brands.set(brand.id, brand);
        json(response, 201, brand);
        return;
      }
      if (request.method === 'POST' && path === '/api/trends/ingest') {
        json(response, 202, { ingested: 0, mode: 'test-demo' });
        return;
      }
      const trendMatch = /^\/api\/brands\/([0-9a-f-]+)\/trends$/i.exec(path);
      if (request.method === 'GET' && trendMatch) {
        const brand = brands.get(trendMatch[1]);
        if (!brand) { json(response, 404, { title: 'Testmerk niet gevonden.' }); return; }
        json(response, 200, brandTrends(brand));
        return;
      }
      if (request.method === 'GET' && path === '/api/social/connections') {
        json(response, 200, []);
        return;
      }
      if (path.startsWith('/api/social/')) {
        json(response, 409, { title: 'Sociale koppelingen zijn uitgeschakeld in deze testomgeving.' });
        return;
      }
      if (request.method === 'POST' && path === '/api/campaigns') {
        const input = await body(request);
        const brand = brands.get(input.brandProfileId);
        const selected = brand && brandTrends(brand).find((entry) => entry.trend.id === input.trendSignalId);
        if (!selected) { json(response, 404, { title: 'Testmerk of testsignaal niet gevonden.' }); return; }
        const campaign = {
          id: randomUUID(), status: 'AwaitingApproval',
          hook: `Een frisse kijk op ${brand.industry}`,
          script: `Laat zien hoe ${brand.businessName} ${brand.targetAudience} helpt met ${brand.productsAndServices}. Sluit af met: ${brand.callToAction}`,
          caption: `${brand.businessName}: ${brand.callToAction}`,
          videoUrl: null, videoProvider: 'test-demo',
        };
        campaigns.set(campaign.id, { campaign, brand, trend: selected.trend, publishingJobs: [] });
        json(response, 202, campaign);
        return;
      }
      const campaignMatch = /^\/api\/campaigns\/([0-9a-f-]+)$/i.exec(path);
      if (request.method === 'GET' && campaignMatch) {
        const entry = campaigns.get(campaignMatch[1]);
        json(response, entry ? 200 : 404, entry ? campaignView(entry) : { title: 'Testcampagne niet gevonden.' });
        return;
      }
      const decisionMatch = /^\/api\/campaigns\/([0-9a-f-]+)\/decision$/i.exec(path);
      if (request.method === 'POST' && decisionMatch) {
        const entry = campaigns.get(decisionMatch[1]);
        if (!entry) { json(response, 404, { title: 'Testcampagne niet gevonden.' }); return; }
        const input = await body(request);
        entry.campaign.status = input.approved ? 'PublishingReady' : 'Rejected';
        entry.publishingJobs = input.approved
          ? [...new Set((entry.brand.preferredPlatforms || ['instagram', 'facebook', 'linkedin'])
            .map((platform) => String(platform).toLowerCase()))]
            .map((platform) => ({ id: randomUUID(), platform, status: 'Ready' }))
          : [];
        json(response, 202, entry.campaign);
        return;
      }
      if (request.method === 'POST' && /^\/api\/campaigns\/[0-9a-f-]+\/publish$/i.test(path)) {
        json(response, 409, { title: 'Publiceren is uitgeschakeld in deze testomgeving.' });
        return;
      }
      json(response, 404, { title: 'Testroute niet gevonden.' });
    } catch (error) {
      json(response, 400, { title: error instanceof Error ? error.message : 'Ongeldige testaanvraag.' });
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
