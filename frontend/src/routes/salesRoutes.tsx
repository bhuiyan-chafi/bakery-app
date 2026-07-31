import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import SalesPage from '../pages/sales/SalesPage';
import MyDeliveriesPage from '../pages/sales/MyDeliveriesPage';

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
  },
  {
    path: '/my-orders',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <MyDeliveriesPage />,
      },
    ]
  }
];
