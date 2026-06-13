/** Verify CORS preflight against the deployed backend */

export async function verifyCors(
  backendUrl: string,
  frontendOrigin: string,
  timeoutMs = 10000
): Promise<string> {
  const base = backendUrl.replace(/\/$/, '');
  const origin = frontendOrigin.replace(/\/$/, '');

  const paths = ['/health', '/api/health', '/'];
  let lastError = '';

  for (const path of paths) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${base}${path}`, {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      const allowOrigin = res.headers.get('access-control-allow-origin');
      if (allowOrigin === origin || allowOrigin === '*') {
        return 'preflight request OK';
      }

      lastError = `Access-Control-Allow-Origin was "${allowOrigin ?? 'missing'}", expected "${origin}"`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastError || 'CORS preflight failed');
}
