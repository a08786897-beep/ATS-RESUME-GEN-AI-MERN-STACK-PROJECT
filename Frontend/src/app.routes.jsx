import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from './features/auth/pages/Login.jsx';
import Register from './features/auth/pages/register.jsx';
import Protected from './features/auth/components/Protected.jsx';
import Dashboard from './features/dashboard/Dashboard.jsx';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: (
      <Protected>
        <Dashboard />
      </Protected>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);