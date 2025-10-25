export const tokenKey = 'caterhub_admin_token';
export const saveToken = (t: string) => localStorage.setItem(tokenKey, t);
export const getToken = () => localStorage.getItem(tokenKey) || '';
export const clearToken = () => localStorage.removeItem(tokenKey);

export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const r = await fetch(input, { ...init, headers });
  if (r.status === 401) {
    clearToken();
    // hard redirect on 401
    window.location.href = '/login';
    return Promise.reject(new Error('Unauthorized'));
  }
  return r;
}
