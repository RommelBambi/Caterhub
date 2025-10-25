import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { saveToken } from '../auth';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Abcd1234!');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { token, user } = await login(email, password);
      if (user?.role !== 'ADMIN') throw new Error('Admin role required');
      saveToken(token);
      nav('/admin/applications');
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 420 }}>
      <h2>Admin Login</h2>
      <form onSubmit={onSubmit}>
        <div>
          <label>Email</label>
          <input
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.currentTarget.value)
            }
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.currentTarget.value)
            }
            style={{ width: '100%' }}
          />
        </div>
        <button type="submit" style={{ marginTop: 12 }}>
          Sign in
        </button>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
      </form>
    </div>
  );
  
}


