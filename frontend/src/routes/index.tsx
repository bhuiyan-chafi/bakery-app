import { createBrowserRouter } from 'react-router-dom';
import { publicRoutes } from './publicRoutes';
import { authRoutes } from './authRoutes';
import { dashboardRoutes } from './dashboardRoutes';
import { productRoutes } from './productRoutes';
import { inventoryRoutes } from './inventoryRoutes';

const router = createBrowserRouter([
  ...publicRoutes,
  ...authRoutes,
  ...dashboardRoutes,
  ...productRoutes,
  ...inventoryRoutes,
]);

export default router;
