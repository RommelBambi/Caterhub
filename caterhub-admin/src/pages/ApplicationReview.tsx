// src/pages/ApplicationReview.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { actOnApp, listApps } from '../api';

export default function ApplicationReview(){
  const { id } = useParams();
  const nav = useNavigate();
  const [row, setRow] = useState<any>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  useEffect(()=> {
    (async()=>{
      try {
        // NEW: listApps takes only status now; token handled by fetchWithAuth
        const list = await listApps('ALL');
        setRow(list.find((x:any)=> String(x.id) === String(id)));
      } catch(e:any){
        setErr(e?.message || 'Failed to load');
      }
    })();
  }, [id]);

  async function doAction(action: 'APPROVE'|'REJECT'){
    try {
      // NEW: actOnApp expects (id, action, note?)
      await actOnApp(Number(id), action, note);
      nav('/admin/applications');
    } catch(e:any){
      setErr(e?.message || 'Action failed');
    }
  }

  if (!row) return <div style={{ padding: 24 }}><p>Loading…</p></div>;

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
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.currentTarget.value)}
          style={{ width:'100%', minHeight: 80 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={()=>doAction('APPROVE')}>Approve</button>
        <button onClick={()=>doAction('REJECT')}>Reject</button>
        <button onClick={()=>nav(-1)}>Back</button>
      </div>
      {err && <p style={{ color:'crimson' }}>{err}</p>}
    </div>
  );
}
