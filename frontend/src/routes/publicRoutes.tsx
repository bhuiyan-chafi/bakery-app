import type { RouteObject } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <LoginPage />,
  }
];
