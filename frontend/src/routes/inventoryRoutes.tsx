import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import InventoryPage from '../pages/inventory/InventoryPage';
import InventoryManage from '../pages/inventory/InventoryManage';

export const inventoryRoutes: RouteObject[] = [
  {
    path: '/inventory',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <InventoryPage />,
      },
      {
        path: 'manage',
        element: <InventoryManage />,
      }
    ]
  }
];
