import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useBattleNads } from '../hooks/useBattleNads';
import { useWallet } from '../providers/WalletProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authenticated } = usePrivy();
  const { address, loading: walletLoading } = useWallet();
  const { getPlayerCharacterID } = useBattleNads();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkCharacter = async () => {
      if (authenticated && address) {
        try {
          const characterID = await getPlayerCharacterID(address);
          setHasCharacter(!!characterID);
        } catch (error) {
          console.error("Error checking character:", error);
          setHasCharacter(false);
        } finally {
          setIsLoading(false);
        }
      } else if (!walletLoading) {
        // If user is not authenticated but wallet loading is complete,
        // we're either logged out or never logged in
        setIsLoading(false);
        setHasCharacter(false);
      }
    };

    checkCharacter();
  }, [authenticated, address, getPlayerCharacterID, walletLoading]);

  // Redirect to login page if not authenticated
  if (!authenticated || !address) {
    console.log("User not authenticated, redirecting to login page");
    return <Navigate to="/" replace />;
  }

  // If we're on the create page and user has a character, redirect to game
  if (location.pathname === '/create' && hasCharacter) {
    return <Navigate to="/game" replace />;
  }

  // If we're on the game page and user has no character, redirect to create
  if (location.pathname === '/game' && hasCharacter === false) {
    return <Navigate to="/create" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 