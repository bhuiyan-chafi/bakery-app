import type { RouteObject } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import CategoryPage from '../pages/products/category/CategoryPage';
import ProductPage from '../pages/products/ProductPage';
import ProductRecipe from '../pages/products/ProductRecipe';
import ProductProduction from '../pages/products/ProductProduction';

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
      },
    ]
  },
  {
    // Recipes — accessed from the sidebar (product selected via dropdown)
    path: '/recipes',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <ProductRecipe />,
      }
    ]
  },
  {
    // Production — accessed from the sidebar (product selected via dropdown)
    path: '/production',
    element: <DashboardLayout />,
    children: [
      {
        path: '',
        element: <ProductProduction />,
      }
    ]
  }
];
