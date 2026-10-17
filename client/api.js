let csrf = '';
export async function api(path, { method = 'GET', body, ...rest } = {}) {
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
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error?.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  if (result.data?.csrfToken) csrf = result.data.csrfToken;
  return result;
}
