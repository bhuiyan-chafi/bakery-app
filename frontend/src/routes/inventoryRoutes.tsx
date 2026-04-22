import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';

export const inventoryRoutes: RouteObject[] = [
  {
    path: '/inventory',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <div className="text-2xl font-light">Inventory tracking coming soon...</div>,
      }
    ]
  }
];
