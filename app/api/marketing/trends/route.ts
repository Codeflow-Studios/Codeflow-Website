const defaultLocalApi = 'http://127.0.0.1:5080';

export async function POST() {
  try {
    const baseUrl = (process.env.MARKETING_API_URL || defaultLocalApi).replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/trends/ingest`, {
      method: 'POST',
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
