import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import SalesPage from '../pages/sales/SalesPage';

export const salesRoutes: RouteObject[] = [
  {
    path: '/sale',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <SalesPage />,
      },
    ]
  }
];
