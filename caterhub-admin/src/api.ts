import { fetchWithAuth } from './auth';

const BASE = import.meta.env.VITE_API_BASE as string;

export async function login(email: string, password: string) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) throw new Error('Login failed');
  return r.json(); // { token, user }
}

export async function me() {
  const r = await fetchWithAuth(`${BASE}/auth/me`);
  if (!r.ok) throw new Error('Failed to fetch user');
  return r.json(); // { user }
}

export async function listApps(tokenOrStatus?: string | 'PENDING', status?: string) {
  const stat = typeof tokenOrStatus === 'string' && status ? status : (tokenOrStatus || 'PENDING');
  const r = await fetchWithAuth(`${BASE}/admin/cater-applications?status=${stat}`);
  if (!r.ok) throw new Error('Failed to fetch applications');
  return r.json();
}

export async function actOnApp(id: number, action: 'APPROVE'|'REJECT', note?: string) {
  const r = await fetchWithAuth(`${BASE}/admin/cater-applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note })
  });
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}
