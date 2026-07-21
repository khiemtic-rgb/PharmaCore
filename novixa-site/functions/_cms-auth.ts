/**
 * Shared helpers for Sveltia CMS GitHub OAuth
 * (adapted from https://github.com/sveltia/sveltia-cms-auth).
 */

export type CmsAuthEnv = {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_HOSTNAME?: string;
  ALLOWED_DOMAINS?: string;
};

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function outputAuthHtml(args: {
  provider?: string;
  token?: string;
  error?: string;
  errorCode?: string;
}): Response {
  const provider = args.provider ?? 'unknown';
  const state = args.error ? 'error' : 'success';
  const content = args.error
    ? { provider, error: args.error, errorCode: args.errorCode }
    : { provider, token: args.token };

  return new Response(
    `<!doctype html><html><body><script>
(() => {
  const provider = ${JSON.stringify(provider)};
  const state = ${JSON.stringify(state)};
  const content = ${JSON.stringify(content)};
  window.addEventListener('message', ({ data, origin }) => {
    if (data === 'authorizing:' + provider) {
      window.opener?.postMessage(
        'authorization:' + provider + ':' + state + ':' + JSON.stringify(content),
        origin
      );
    }
  });
  window.opener?.postMessage('authorizing:' + provider, '*');
})();
</script></body></html>`,
    {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Set-Cookie': 'csrf-token=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure',
      },
    },
  );
}

export function isDomainAllowed(domain: string | undefined, allowedDomains: string | undefined): boolean {
  if (!allowedDomains) return true;
  return allowedDomains.split(',').some((str) =>
    (domain ?? '').match(new RegExp(`^${escapeRegExp(str.trim()).replace('\\*', '.+')}$`)),
  );
}

export async function handleCmsAuth(request: Request, env: CmsAuthEnv): Promise<Response> {
  const { origin, searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') ?? '';
  const domain = searchParams.get('site_id') ?? undefined;

  if (provider !== 'github') {
    return outputAuthHtml({
      error: 'Your Git backend is not supported by the authenticator.',
      errorCode: 'UNSUPPORTED_BACKEND',
    });
  }

  if (!isDomainAllowed(domain, env.ALLOWED_DOMAINS)) {
    return outputAuthHtml({
      provider,
      error: 'Your domain is not allowed to use the authenticator.',
      errorCode: 'UNSUPPORTED_DOMAIN',
    });
  }

  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return outputAuthHtml({
      provider,
      error: 'OAuth app client ID or secret is not configured.',
      errorCode: 'MISCONFIGURED_CLIENT',
    });
  }

  const hostname = env.GITHUB_HOSTNAME?.trim() || 'github.com';
  const csrfToken = crypto.randomUUID().replaceAll('-', '');
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo,user',
    state: csrfToken,
  });

  // origin kept for future GitLab parity / debugging
  void origin;

  return new Response('', {
    status: 302,
    headers: {
      Location: `https://${hostname}/login/oauth/authorize?${params.toString()}`,
      'Set-Cookie': `csrf-token=github_${csrfToken}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax; Secure`,
    },
  });
}

export async function handleCmsCallback(request: Request, env: CmsAuthEnv): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/\bcsrf-token=([a-z-]+?)_([0-9a-f]{32})\b/);
  const provider = match?.[1];
  const csrfToken = match?.[2];

  if (provider !== 'github') {
    return outputAuthHtml({
      error: 'Your Git backend is not supported by the authenticator.',
      errorCode: 'UNSUPPORTED_BACKEND',
    });
  }

  if (!code || !state) {
    return outputAuthHtml({
      provider,
      error: 'Failed to receive an authorization code. Please try again later.',
      errorCode: 'AUTH_CODE_REQUEST_FAILED',
    });
  }

  if (!csrfToken || state !== csrfToken) {
    return outputAuthHtml({
      provider,
      error: 'Potential CSRF attack detected. Authentication flow aborted.',
      errorCode: 'CSRF_DETECTED',
    });
  }

  const clientId = env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return outputAuthHtml({
      provider,
      error: 'OAuth app client ID or secret is not configured.',
      errorCode: 'MISCONFIGURED_CLIENT',
    });
  }

  const hostname = env.GITHUB_HOSTNAME?.trim() || 'github.com';
  let response: Response;
  try {
    response = await fetch(`https://${hostname}/login/oauth/access_token`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
  } catch {
    return outputAuthHtml({
      provider,
      error: 'Failed to request an access token. Please try again later.',
      errorCode: 'TOKEN_REQUEST_FAILED',
    });
  }

  try {
    const data = (await response.json()) as { access_token?: string; error?: string };
    return outputAuthHtml({ provider, token: data.access_token, error: data.error });
  } catch {
    return outputAuthHtml({
      provider,
      error: 'Server responded with malformed data. Please try again later.',
      errorCode: 'MALFORMED_RESPONSE',
    });
  }
}
