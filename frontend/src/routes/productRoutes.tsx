import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import CategoryPage from '../pages/products/category/CategoryPage';
import ProductPage from '../pages/products/ProductPage';

export const productRoutes: RouteObject[] = [
  {
    path: '/products',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <ProductPage />,
      },
      {
        path: 'categories',
        element: <CategoryPage />,
      }
    ]
  }
];
