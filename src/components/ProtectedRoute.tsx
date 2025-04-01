import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useBattleNads } from '../hooks/useBattleNads';
import { useWallet } from '../providers/WalletProvider';
import { Spinner, Center, Text } from '@chakra-ui/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authenticated } = usePrivy();
  const { ownerWallet, sessionWallet, allWalletsReady, loading: walletLoading } = useWallet();
  const { getPlayerCharacterID } = useBattleNads();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkCharacter = async () => {
      // We need both wallets connected to proceed with the game
      if (authenticated && ownerWallet.connected) {
        try {
          console.log("Protected route: checking for character...");
          
          // Use Promise.race with a timeout to prevent hanging
          const characterCheckPromise = getPlayerCharacterID(ownerWallet.address as string);
          const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => {
              console.warn("Protected route: character check timeout reached");
              resolve(null);
            }, 10000); // 10 second timeout
          });
          
          const characterID = await Promise.race([characterCheckPromise, timeoutPromise]);
          
          if (characterID) {
            console.log("Protected route: found character ID", characterID);
            setHasCharacter(true);
          } else {
            console.log("Protected route: no character found or check timed out");
            setHasCharacter(false);
          }
        } catch (error) {
          console.error("Protected route: error checking character:", error);
          // If there's an error, assume no character for safety
          setHasCharacter(false);
        } finally {
          setIsLoading(false);
        }
      } else if (!walletLoading) {
        // If user is not authenticated or owner wallet not connected but wallet loading is complete,
        // we're either logged out or never logged in
        console.log("Protected route: owner wallet not connected or not authenticated");
        setIsLoading(false);
        setHasCharacter(false);
      }
    };

    checkCharacter();
    
    // Add a backup timeout to ensure we don't get stuck forever in loading state
    const backupTimeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Protected route: forcing out of loading state after timeout");
        setIsLoading(false);
        // For safety, direct unauthenticated users to login
        if (!authenticated || !ownerWallet.connected) {
          setHasCharacter(false);
        }
        // If we have auth but no character determination yet, assume they need to create one
        else if (hasCharacter === null) {
          setHasCharacter(false);
        }
      }
    }, 15000); // 15 second max loading time
    
    return () => clearTimeout(backupTimeout);
  }, [authenticated, ownerWallet.connected, ownerWallet.address, getPlayerCharacterID, walletLoading, isLoading, hasCharacter]);

  // Redirect to login page if not authenticated or owner wallet not connected
  if (!authenticated || !ownerWallet.connected) {
    console.log("User not authenticated or owner wallet not connected, redirecting to login page");
    return <Navigate to="/" replace />;
  }

  // Show a loading spinner if we're still loading
  if (isLoading) {
    return (
      <Center height="100vh">
        <Spinner size="xl" color="purple.500" thickness="4px" />
        <Text ml={4} color="white">Checking character status...</Text>
      </Center>
    );
  }

  // If we're on the create page and user has a character, redirect to game
  if (location.pathname === '/create' && hasCharacter) {
    return <Navigate to="/game" replace />;
  }

  // If we're on the game page and user has no character, redirect to create
  if (location.pathname === '/game' && hasCharacter === false) {
    return <Navigate to="/create" replace />;
  }

  // Both wallets should be connected for game access
  if (location.pathname === '/game' && !sessionWallet.connected) {
    console.log("Session wallet not connected, redirecting to login page");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 