const defaultLocalApi = 'http://127.0.0.1:5080';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const baseUrl = (process.env.MARKETING_API_URL || defaultLocalApi).replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/api/prompts/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000),
    });

    return new Response(await response.text(), {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch (error) {
    console.error('Marketing prompt request failed', error);
    return Response.json({ title: 'Marketing prompt service unavailable' }, { status: 503 });
  }
}
