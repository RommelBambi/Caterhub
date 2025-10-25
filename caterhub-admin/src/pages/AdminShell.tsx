import { Outlet, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { clearToken } from '../auth';

export default function AdminShell(){
  const nav = useNavigate();
  function onLogout(){
    clearToken();
    nav('/login', { replace: true });
  }
  return (
    <div>
      <Topbar onLogout={onLogout} />
      <div style={{ maxWidth: 980, margin: '12px auto', padding: '0 18px' }}>
        <Outlet />
      </div>
    </div>
  );
}
