import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useBattleNads } from '../hooks/useBattleNads';
import { useWallet } from '../providers/WalletProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authenticated, ready, user } = usePrivy();
  const { embeddedWallet, injectedWallet, address, loading: walletLoading } = useWallet();
  const { getPlayerCharacterID } = useBattleNads();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);
  const location = useLocation();
  // Add a ref to track redirects
  const redirectingRef = useRef(false);
  // Track if we've completed the character check
  const [characterCheckComplete, setCharacterCheckComplete] = useState(false);
  // Track where to redirect if needed
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // Prefer embedded wallet address, fall back to injected, then fall back to the address property
  const activeAddress = embeddedWallet?.address || injectedWallet?.address || address || user?.wallet?.address;

  // Reset redirecting flag when location changes
  useEffect(() => {
    redirectingRef.current = false;
  }, [location.pathname]);

  // Main effect for checking authentication and wallet state
  useEffect(() => {
    console.log("Wallet state in ProtectedRoute:", {
      authenticated, 
      ready,
      address,
      embeddedAddress: embeddedWallet?.address,
      injectedAddress: injectedWallet?.address,
      userWalletAddress: user?.wallet?.address,
      activeAddress,
      walletLoading
    });

    // Handle redirection for authentication
    if (!authenticated || !ready) {
      console.log("User not authenticated or not ready, redirecting to login page");
      setRedirectTo("/");
      setIsLoading(false);
      return;
    }

    // Handle case where user is authenticated but has no wallet
    if (authenticated && ready && !activeAddress && !walletLoading) {
      console.log("Authenticated but no wallet detected!");
      if (location.pathname !== "/") {
        setRedirectTo("/");
      }
      setIsLoading(false);
      return;
    }

    const checkCharacter = async () => {
      if (authenticated && ready && activeAddress) {
        try {
          console.log("Checking character for address:", activeAddress);
          const characterID = await getPlayerCharacterID(activeAddress);
          console.log("Character check result:", characterID);
          setHasCharacter(!!characterID);
          
          // Handle character-based redirects
          if (!!characterID && location.pathname === '/create') {
            setRedirectTo('/game');
          } else if (!characterID && location.pathname === '/game') {
            setRedirectTo('/create');
          } else {
            setRedirectTo(null);
          }
          
          setIsLoading(false);
          setCharacterCheckComplete(true);
        } catch (error) {
          console.error("Error checking character:", error);
          setHasCharacter(false);
          setIsLoading(false);
          setCharacterCheckComplete(true);
          
          // If error checking character, default to create page
          if (location.pathname === '/game') {
            setRedirectTo('/create');
          }
        }
      } else if (walletLoading) {
        // Still loading wallet info
        console.log("Wallet still loading...");
        setIsLoading(true);
        setRedirectTo(null);
      } else {
        // If authenticated but no address, and not still loading wallet
        console.warn("User authenticated but no wallet address available!");
        setIsLoading(false);
        setCharacterCheckComplete(true);
        setHasCharacter(false);
        
        if (location.pathname !== "/") {
          setRedirectTo("/");
        }
      }
    };

    checkCharacter();
  }, [authenticated, ready, activeAddress, getPlayerCharacterID, walletLoading, user, location.pathname]);

  // Show loading indicator if we're still loading
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Handle redirects
  if (redirectTo && !redirectingRef.current) {
    redirectingRef.current = true;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 