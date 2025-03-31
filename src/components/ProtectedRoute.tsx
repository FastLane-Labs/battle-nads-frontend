import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useBattleNads } from '../hooks/useBattleNads';
import { Spinner, Center, VStack, Text } from '@chakra-ui/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { authenticated, ready, user } = usePrivy();
  const { getPlayerCharacters } = useBattleNads();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkCharacter = async () => {
      if (ready && authenticated && user?.wallet?.address) {
        try {
          const characters = await getPlayerCharacters(user.wallet.address);
          setHasCharacter(characters && characters.length > 0);
        } catch (error) {
          console.error("Error checking character:", error);
          setHasCharacter(false);
        } finally {
          setIsLoading(false);
        }
      } else if (ready) {
        setIsLoading(false);
      }
    };

    checkCharacter();
  }, [ready, authenticated, user, getPlayerCharacters]);

  if (!ready || isLoading) {
    return (
      <Center height="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading...</Text>
        </VStack>
      </Center>
    );
  }

  if (!authenticated) {
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