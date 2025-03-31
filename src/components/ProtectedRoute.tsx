import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';

type ProtectedRouteProps = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { authenticated } = usePrivy();

  if (!authenticated) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 