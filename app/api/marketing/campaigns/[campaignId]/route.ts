const defaultLocalApi = 'http://127.0.0.1:5080';

async function forward(request: Request, method: 'GET' | 'POST', context: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await context.params;
    const baseUrl = (process.env.MARKETING_API_URL || defaultLocalApi).replace(/\/$/, '');
    const suffix = method === 'POST' ? '/decision' : '';
    const response = await fetch(`${baseUrl}/api/campaigns/${encodeURIComponent(campaignId)}${suffix}`, {
      method,
      headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
      body: method === 'POST' ? await request.text() : undefined,
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

export function GET(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  return forward(request, 'GET', context);
}

export function POST(request: Request, context: { params: Promise<{ campaignId: string }> }) {
  return forward(request, 'POST', context);
}
