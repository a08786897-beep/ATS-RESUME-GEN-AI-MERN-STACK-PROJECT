import { useContext, useEffect } from 'react';
import { AuthContext } from '../auth.context.js';
import { login, register, logout, getSession } from '../services/auth.api.js';

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  const { user, setUser, loading, setLoading } = context;

  const handleLogin = async ({ email, password }) => {
    const data = await login({ email, password });
    setUser(data.user || null);
    return data;
  };

  const handleRegister = async ({ username, email, password }) => {
    const data = await register({ username, email, password });
    setUser(data.user || null);
    return data;
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  useEffect(() => {
    let active = true;

    const getAndSetUser = async () => {
      try {
        const data = await getSession();
        if (active) {
          setUser(data?.user || null);
        }
      } catch (error) {
        console.error('Session verification failed:', error);
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    getAndSetUser();

    return () => {
      active = false;
    };
  }, [setLoading, setUser]);

  return { user, loading, handleLogin, handleRegister, handleLogout };
};