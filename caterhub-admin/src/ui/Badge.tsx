export default function Badge({ label, tone='default' }:{ label: string; tone?: 'default'|'success'|'danger' }){
  const color = tone==='success' ? '#065f46' : tone==='danger' ? '#991b1b' : '#334155';
  const bg = tone==='success' ? '#dcfce7' : tone==='danger' ? '#fee2e2' : '#e2e8f0';
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:999, background:bg, color, fontWeight:700, fontSize:12 }}>{label}</span>;
}
