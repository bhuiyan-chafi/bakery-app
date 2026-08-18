import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import StaffManagement from '../pages/staff/StaffManagement';
import StaffEditPage from '../pages/staff/StaffEditPage';
import ViewAttendance from '../pages/staff/ViewAttendance';
import StaffSalaryManagement from '../pages/staff/StaffSalaryManagement';

export const staffRoutes: RouteObject[] = [
  {
    path: '/staff',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <StaffManagement />,
      },
      {
        path: ':id/edit',
        element: <StaffEditPage />,
      },
      {
        path: ':id/attendance',
        element: <ViewAttendance />,
      },
      {
        path: ':id/salary',
        element: <StaffSalaryManagement />,
      },
    ]
  }
];
