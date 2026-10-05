import { Navigate } from 'react-router';

export const meta = () => [{ title: 'Hashsome demo' }];

export default function Start() {
  return <Navigate to="/home" replace />;
}
