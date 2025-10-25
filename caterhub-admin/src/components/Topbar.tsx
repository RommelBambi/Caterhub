import Button from '../ui/Button';

export default function Topbar({ onLogout, user }:{ onLogout:()=>void; user?: any }){
  return (
    <div style={{ background:'#C836F9', color:'#fff', padding:'12px 0' }}>
      <div style={{ maxWidth:980, margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight:900, fontSize:20 }}>CaterHub Admin</div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {user && <div style={{ background:'#ffffff22', borderRadius:999, padding:'6px 12px', border:'1px solid #ffffff55' }}>{user.username}</div>}
          <Button label="Logout" variant="outline" onClick={onLogout} />
        </div>
      </div>
    </div>
  );
}
