import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useBattleNads } from '../hooks/useBattleNads';
import { useWallet } from '../providers/WalletProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authenticated, ready } = usePrivy();
  const { address, loading: walletLoading } = useWallet();
  const { getPlayerCharacterID } = useBattleNads();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);
  const location = useLocation();
  // Add a ref to track redirects
  const redirectingRef = useRef(false);
  // Track if we've completed the character check
  const [characterCheckComplete, setCharacterCheckComplete] = useState(false);

  useEffect(() => {
    const checkCharacter = async () => {
      if (authenticated && ready && address) {
        try {
          const characterID = await getPlayerCharacterID(address);
          setHasCharacter(!!characterID);
        } catch (error) {
          console.error("Error checking character:", error);
          setHasCharacter(false);
        } finally {
          setIsLoading(false);
          setCharacterCheckComplete(true);
        }
      } else if (!walletLoading) {
        // If user is not authenticated but wallet loading is complete,
        // we're either logged out or never logged in
        setIsLoading(false);
        setCharacterCheckComplete(true);
        setHasCharacter(false);
      }
    };

    checkCharacter();
  }, [authenticated, address, getPlayerCharacterID, walletLoading]);

  // Redirect to login page if not authenticated
  if (!authenticated || !ready || !address) {
    // Only log and redirect if we're not already redirecting
    if (!redirectingRef.current) {
      console.log("User not authenticated, redirecting to login page");
      redirectingRef.current = true;
      return <Navigate to="/" replace />;
    }
  }

  // Only process character-based redirects after the character check is complete
  if (characterCheckComplete && !isLoading) {
    // If we're on the create page and user has a character, redirect to game
    if (location.pathname === '/create' && hasCharacter && !redirectingRef.current) {
      redirectingRef.current = true;
      return <Navigate to="/game" replace />;
    }

    // If we're on the game page and user has no character, redirect to create
    if (location.pathname === '/game' && hasCharacter === false && !redirectingRef.current) {
      redirectingRef.current = true;
      return <Navigate to="/create" replace />;
    }
  }

  // Reset redirecting flag when location changes or if rendering children
  useEffect(() => {
    redirectingRef.current = false;
  }, [location.pathname]);

  return <>{children}</>;
};

export default ProtectedRoute; 