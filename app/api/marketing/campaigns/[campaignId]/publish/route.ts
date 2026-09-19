const defaultLocalApi = 'http://127.0.0.1:5080';

// Publish stays separate from approval so the dashboard performs a true publish mutation.
export async function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await context.params;
    const baseUrl = (process.env.MARKETING_API_URL || defaultLocalApi).replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/campaigns/${encodeURIComponent(campaignId)}/publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: await request.text(),
      signal: AbortSignal.timeout(15000),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch {
    return Response.json({ title: 'Marketing service unavailable' }, { status: 503 });
  }
}
