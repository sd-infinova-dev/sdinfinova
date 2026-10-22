let csrfToken: string | undefined;

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!csrfToken) {
      const tokenResponse = await fetch('/api/v1/auth/csrf-token', { credentials: 'same-origin', cache: 'no-store' });
      if (!tokenResponse.ok) throw new Error('Unable to establish a secure session. Refresh and try again.');
      const tokenPayload = await tokenResponse.json() as { csrfToken?: string };
      if (!tokenPayload.csrfToken) throw new Error('Unable to establish a secure session. Refresh and try again.');
      csrfToken = tokenPayload.csrfToken;
    }
    headers.set('X-CSRF-Token', csrfToken);
  }

  const response = await fetch(input, { ...init, headers, credentials: 'same-origin' });
  if (response.status === 403) csrfToken = undefined;
  return response;
}
