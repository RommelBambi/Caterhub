import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { actOnApp, listApps } from '../api';
import { getToken } from '../auth';

type AppRow = {
  id: number;
  createdAt: string;
  ownerName: string;
  businessName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export default function ApplicationReview() {
  const token = getToken();
  const { id } = useParams();
  const appId = useMemo(() => Number(id), [id]);
  const nav = useNavigate();

  const [row, setRow] = useState<AppRow | null>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!token || !appId) return;
    (async () => {
      try {
        const list: AppRow[] = await listApps(token, 'ALL');
        const found = list.find((x) => x.id === appId) ?? null;
        setRow(found);
        setErr(found ? '' : 'Application not found');
      } catch (e: any) {
        setErr(e?.message || 'Failed to load');
      }
    })();
  }, [token, appId]);

  async function doAction(action: 'APPROVE' | 'REJECT') {
    try {
      await actOnApp(token, appId, action, note);
      nav('/admin/applications');
    } catch (e: any) {
      setErr(e?.message || 'Action failed');
    }
  }

  if (!row) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading…</p>
        {err && <p style={{ color: 'crimson' }}>{err}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Application #{row.id}</h2>
      <p><b>Owner:</b> {row.ownerName}</p>
      <p><b>Business:</b> {row.businessName}</p>
      <p><b>Email:</b> {row.email}</p>
      {row.phone && <p><b>Phone:</b> {row.phone}</p>}
      {row.address && <p><b>Address:</b> {row.address}</p>}
      <p><b>Status:</b> {row.status}</p>

      <div style={{ marginTop: 16 }}>
        <label>Admin note</label>
        <textarea
          value={note}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            setNote(e.currentTarget.value)
          }
          style={{ width: '100%', minHeight: 80 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => doAction('APPROVE')}>Approve</button>
        <button onClick={() => doAction('REJECT')}>Reject</button>
        <button onClick={() => nav(-1)}>Back</button>
      </div>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
    </div>
  );
}
