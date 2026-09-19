const defaultLocalApi = 'http://127.0.0.1:5080';

export async function GET(request: Request) {
  try {
    const brandProfileId = new URL(request.url).searchParams.get('brandProfileId');
    if (!brandProfileId) return Response.json({ title: 'Brand profile is required' }, { status: 400 });

    const baseUrl = (process.env.MARKETING_API_URL || defaultLocalApi).replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/social/connections?brandProfileId=${encodeURIComponent(brandProfileId)}`, {
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
