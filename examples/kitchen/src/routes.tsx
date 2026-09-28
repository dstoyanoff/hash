import type { RouteObject } from 'react-router';
import Home from './pages/home.tsx';

// Single-page dashboard for now — add more entries here (and a layout.tsx with NavTabs, see
// dashboard-rules) if this grows a second page (e.g. a pantry view).
export default [{ index: true, element: <Home /> }] satisfies RouteObject[];
