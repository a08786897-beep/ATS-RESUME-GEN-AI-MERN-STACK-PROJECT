import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const Protected = ({ children }) => {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
        <h1 className="text-2xl font-semibold">Loading your workspace...</h1>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default Protected;
