import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listApps } from '../api';
import { getToken } from '../auth';

type Status = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type AppRow = {
  id: number;
  createdAt: string;
  ownerName: string;
  businessName: string;
  email: string;
  status: Exclude<Status, 'ALL'>;
};

export default function Applications() {
  const token = getToken();
  const [status, setStatus] = useState<Status>('PENDING');
  const [rows, setRows] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data: AppRow[] = await listApps(token, status);
        if (mounted) {
          setRows(data);
          setErr('');
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, status]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Caterer Applications</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Status: </label>
        <select
          value={status}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setStatus(e.currentTarget.value as Status)
          }
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : err ? (
        <p style={{ color: 'crimson' }}>{err}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Created</th>
              <th>Owner</th>
              <th>Business</th>
              <th>Email</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.ownerName}</td>
                <td>{r.businessName}</td>
                <td>{r.email}</td>
                <td>{r.status}</td>
                <td>
                  <Link to={`/admin/applications/${r.id}`}>Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
