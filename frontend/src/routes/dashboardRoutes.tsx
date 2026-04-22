import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardPage from '../pages/dashboard/DashboardPage';

export const dashboardRoutes: RouteObject[] = [
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <DashboardPage />,
      }
    ]
  }
];
