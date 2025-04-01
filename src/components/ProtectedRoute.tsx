'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../providers/WalletProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { address } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!address) {
      router.push('/');
    }
  }, [address, router]);

  if (!address) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 