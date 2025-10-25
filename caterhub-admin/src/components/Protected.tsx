import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { clearToken, getToken } from '../auth';
import { me } from '../api';

export default function Protected(){
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(()=> {
    (async ()=>{
      try {
        const token = getToken();
        if (!token) return setOk(false);
        const { user } = await me();
        if (!user || user.role !== 'ADMIN') {
          clearToken();
          setOk(false);
        } else {
          setOk(true);
        }
      } catch {
        setOk(false);
      }
    })();
  }, []);

  if (ok === null) return <div style={{ padding: 24 }}>Checking session…</div>;
  if (!ok) return <Navigate to="/login" replace />;
  return <Outlet />;
}
