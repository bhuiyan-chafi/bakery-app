import { createBrowserRouter } from 'react-router-dom';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { dashboardRoutes } from './dashboardRoutes';
import { productRoutes } from './productRoutes';
import { inventoryRoutes } from './inventoryRoutes';
import { settingsRoutes } from './settingsRoutes';

const router = createBrowserRouter([
  ...publicRoutes,
  ...authRoutes,
  ...dashboardRoutes,
  ...productRoutes,
  ...inventoryRoutes,
  ...settingsRoutes,
]);

export default router;
