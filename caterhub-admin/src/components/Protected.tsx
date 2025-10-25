import { Outlet, Navigate } from 'react-router-dom';
import { getToken } from '../auth';
export default function Protected(){
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
