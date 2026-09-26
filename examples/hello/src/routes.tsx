import type { RouteObject } from 'react-router';
import Home from './pages/home.tsx';

export default [{ index: true, element: <Home /> }] satisfies RouteObject[];
