const BASE = import.meta.env.VITE_API_BASE as string;

export async function login(email: string, password: string) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) throw new Error('Login failed');
  return r.json(); // { token, user }
}

export async function listApps(token: string, status = 'PENDING') {
  const r = await fetch(`${BASE}/admin/cater-applications?status=${status}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error('Failed to fetch applications');
  return r.json();
}

export async function actOnApp(token: string, id: number, action: 'APPROVE'|'REJECT', note?: string) {
  const r = await fetch(`${BASE}/admin/cater-applications/${id}`, {
    method:'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, note })
  });
  if (!r.ok) throw new Error('Update failed');
  return r.json();
}
