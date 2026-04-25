import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import SettingsPage from '../pages/settings/SettingsPage';
import MeasurementUnit from '../pages/settings/measurement-unit/MeasurementUnit';

export const settingsRoutes: RouteObject[] = [
  {
    path: '/settings',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <SettingsPage />,
      },
      {
        path: 'measurement-unit',
        element: <MeasurementUnit />,
      }
    ]
  }
];
