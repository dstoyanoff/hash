import type { RouteObject } from 'react-router';
import Layout from './layout.tsx';
import Downstairs from './pages/downstairs.tsx';
import Upstairs from './pages/upstairs.tsx';

export default [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Downstairs /> },
      { path: 'upstairs', element: <Upstairs /> },
    ],
  },
] satisfies RouteObject[];
