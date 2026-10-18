type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown };
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
let csrf = '';
export async function api<T = unknown>(
  path: string,
  { method = 'GET', body, ...rest }: ApiOptions = {},
): Promise<T> {
  if (!csrf && method !== 'GET') {
    const r = await fetch('/api/auth/csrf');
    csrf = (await r.json()).data.csrfToken;
  }
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...rest,
  });
  if (response.status === 204) return null as T;
  const result = await response.json();
  if (!response.ok) {
    throw new ApiError(
      result.error?.message || 'Request failed.',
      response.status,
    );
  }
  if (result.data?.csrfToken) csrf = result.data.csrfToken;
  return result;
}
