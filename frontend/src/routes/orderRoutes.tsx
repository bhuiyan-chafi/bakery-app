import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import OrderPage from '../pages/orders/OrderPage';
import ManageOrder from '../pages/orders/ManageOrder';

export const orderRoutes: RouteObject[] = [
  {
    path: '/orders',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <OrderPage />,
      },
      {
        path: 'manage',
        element: <ManageOrder />,
      },
    ]
  }
];
