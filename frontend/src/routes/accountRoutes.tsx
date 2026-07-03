import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import AccountsPage from '../pages/accounts/AccountsPage';
import MiscellaneousPage from '../pages/accounts/MiscellaneousPage';

export const accountRoutes: RouteObject[] = [
  {
    path: '/accounts',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <AccountsPage />,
      },
      {
        path: 'miscellaneous',
        element: <MiscellaneousPage />,
      },
    ]
  }
];
