import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useBattleNads } from '../hooks/useBattleNads';
import LoadingScreen from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authenticated, ready, user } = usePrivy();
  const { getPlayerCharacterID } = useBattleNads();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkCharacter = async () => {
      if (ready && authenticated && user?.wallet?.address) {
        try {
          const characterID = await getPlayerCharacterID(user.wallet.address);
          setHasCharacter(!!characterID);
        } catch (error) {
          console.error("Error checking character:", error);
          setHasCharacter(false);
        } finally {
          setIsLoading(false);
        }
      } else if (ready) {
        // If user is not authenticated but ready state is available,
        // we're either logged out or never logged in
        setIsLoading(false);
        setHasCharacter(false);
      }
    };

    checkCharacter();
  }, [ready, authenticated, user, getPlayerCharacterID]);

  if (!ready || isLoading) {
    return (
      <LoadingScreen 
        message={
          location.pathname === '/game' 
            ? "Loading your character..." 
            : "Checking authentication status..."
        } 
      />
    );
  }

  // Redirect to login page if not authenticated
  if (!authenticated) {
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