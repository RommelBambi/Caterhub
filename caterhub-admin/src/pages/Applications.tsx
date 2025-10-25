import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getToken } from '../auth';
import { fetchWithAuth } from '../auth';
import Badge from '../ui/Badge';

const BASE = import.meta.env.VITE_API_BASE as string;

export default function Applications(){
  const [status, setStatus] = useState<'ALL'|'PENDING'|'APPROVED'|'REJECTED'>('PENDING');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load(){
    setLoading(true);
    try {
      const url = `${BASE}/admin/cater-applications?status=${status}&q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`;
      const r = await fetchWithAuth(url);
      const data = await r.json();
      setRows(data.rows);
      setTotal(data.total);
      setPages(data.pages);
      setErr('');
    } catch(e:any){
      setErr(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [status, page]);
  // trigger search on Enter
  function onKey(e: React.KeyboardEvent<HTMLInputElement>){
    if (e.key === 'Enter') { setPage(1); load(); }
  }

  function badgeTone(s: string){
    if (s === 'APPROVED') return 'success';
    if (s === 'REJECTED') return 'danger';
    return 'default';
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop:0 }}>Caterer Applications</h2>

      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom: 12 }}>
        <label>Status: </label>
        <select
          value={status}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setStatus(e.currentTarget.value as any);
            setPage(1);
          }}
        >
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ALL">All</option>
        </select>

        <input
          placeholder="Search owner/business/email…"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.currentTarget.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') { setPage(1); load(); }
          }}
        />
        <button onClick={()=>{ setPage(1); load(); }}>Search</button>
      </div>

      {loading ? <p>Loading…</p> : err ? <p style={{ color:'crimson' }}>{err}</p> : (
        <>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <th style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #eee' }}>ID</th>
              <th style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #eee' }}>Created</th>
              <th style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #eee' }}>Owner</th>
              <th style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #eee' }}>Business</th>
              <th style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #eee' }}>Email</th>
              <th style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #eee' }}>Status</th>
              <th style={{ textAlign:'left', padding:'8px 6px', borderBottom:'1px solid #eee' }}>Action</th>
            </tr></thead>
            <tbody>
              {rows.map((r:any)=>(
                <tr key={r.id}>
                  <td style={{ padding:'8px 6px', borderBottom:'1px solid #f4f4f5' }}>{r.id}</td>
                  <td style={{ padding:'8px 6px', borderBottom:'1px solid #f4f4f5' }}>{new Date(r.createdAt).toLocaleString()}</td>
                  <td style={{ padding:'8px 6px', borderBottom:'1px solid #f4f4f5' }}>{r.ownerName}</td>
                  <td style={{ padding:'8px 6px', borderBottom:'1px solid #f4f4f5' }}>{r.businessName}</td>
                  <td style={{ padding:'8px 6px', borderBottom:'1px solid #f4f4f5' }}>{r.email}</td>
                  <td style={{ padding:'8px 6px', borderBottom:'1px solid #f4f4f5' }}>
                    <Badge label={r.status} tone={badgeTone(r.status) as any} />
                  </td>
                  <td style={{ padding:'8px 6px', borderBottom:'1px solid #f4f4f5' }}>
                    <Link to={`/admin/applications/${r.id}`}>Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:12 }}>
            <span>Page {page} of {pages} ({total} total)</span>
            <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
            <button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
