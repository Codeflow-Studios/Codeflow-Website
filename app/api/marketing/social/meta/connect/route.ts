const defaultLocalApi = 'http://127.0.0.1:5080';

export async function GET(request: Request) {
  const brandProfileId = new URL(request.url).searchParams.get('brandProfileId');
  if (!brandProfileId) return Response.json({ title: 'Brand profile is required' }, { status: 400 });

  const baseUrl = (process.env.MARKETING_API_URL || defaultLocalApi).replace(/\/$/, '');
  return Response.redirect(
    `${baseUrl}/api/social/meta/connect?brandProfileId=${encodeURIComponent(brandProfileId)}`,
    307,
  );
}
