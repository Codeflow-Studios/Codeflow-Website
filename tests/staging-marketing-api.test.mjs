import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startStagingMarketingApi } from '../scripts/staging-marketing-api.mjs';

test('test data stays local while onboarding and campaign approval work', async () => {
  const server = await startStagingMarketingApi(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, payload) => fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  try {
    const brandResponse = await post('/api/brands', {
      businessName: 'Voorbeeldstudio', industry: 'software',
      targetAudience: 'kleine bedrijven', productsAndServices: 'websites',
      callToAction: 'Vraag een demo aan', preferredPlatforms: ['instagram'],
    });
    assert.equal(brandResponse.status, 201);
    const brand = await brandResponse.json();

    const trendsResponse = await fetch(`${base}/api/brands/${brand.id}/trends`);
    assert.equal(trendsResponse.status, 200);
    const trends = await trendsResponse.json();
    assert.equal(trends.length, 3);
    assert.match(trends[0].trend.title, /kleine bedrijven/);

    const campaignResponse = await post('/api/campaigns', {
      brandProfileId: brand.id, trendSignalId: trends[0].trend.id,
    });
    assert.equal(campaignResponse.status, 202);
    const campaign = await campaignResponse.json();
    assert.equal(campaign.status, 'AwaitingApproval');

    const decisionResponse = await post(`/api/campaigns/${campaign.id}/decision`, { approved: true });
    assert.equal(decisionResponse.status, 202);
    const approved = await fetch(`${base}/api/campaigns/${campaign.id}`).then((response) => response.json());
    assert.equal(approved.campaign.status, 'PublishingReady');
    assert.equal(approved.publishingJobs[0].platform, 'instagram');

    const publishResponse = await post(`/api/campaigns/${campaign.id}/publish`, { platform: 'instagram' });
    assert.equal(publishResponse.status, 409);
    const connectionsResponse = await fetch(`${base}/api/social/connections?brandProfileId=${brand.id}`);
    assert.deepEqual(await connectionsResponse.json(), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
