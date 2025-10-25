export const tokenKey = 'caterhub_admin_token';
export const saveToken = (t: string) => localStorage.setItem(tokenKey, t);
export const getToken = () => localStorage.getItem(tokenKey) || '';
export const clearToken = () => localStorage.removeItem(tokenKey);
