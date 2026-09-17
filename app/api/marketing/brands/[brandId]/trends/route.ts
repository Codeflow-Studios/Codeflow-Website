const defaultLocalApi = 'http://127.0.0.1:5080';

export async function GET(_request: Request, context: { params: Promise<{ brandId: string }> }) {
  try {
    const { brandId } = await context.params;
    const baseUrl = (process.env.MARKETING_API_URL || defaultLocalApi).replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/brands/${encodeURIComponent(brandId)}/trends?limit=3`, {
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
