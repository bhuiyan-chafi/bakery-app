import type { RouteObject } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';

export const authRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <div>Register Page</div>,
  }
];
