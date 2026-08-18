import { createBrowserRouter } from 'react-router-dom';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { dashboardRoutes } from './dashboardRoutes';
import { productRoutes } from './productRoutes';
import { inventoryRoutes } from './inventoryRoutes';
import { settingsRoutes } from './settingsRoutes';
import { orderRoutes } from './orderRoutes';
import { accountRoutes } from './accountRoutes';
import { salesRoutes } from './salesRoutes';
import { staffRoutes } from './staffRoutes';

const router = createBrowserRouter([
  ...publicRoutes,
  ...authRoutes,
  ...dashboardRoutes,
  ...productRoutes,
  ...inventoryRoutes,
  ...settingsRoutes,
  ...orderRoutes,
  ...accountRoutes,
  ...salesRoutes,
  ...staffRoutes,
]);

export default router;
