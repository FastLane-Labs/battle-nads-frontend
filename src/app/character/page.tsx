'use client';

import React, { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import NavBar from '../../components/NavBar';
import CharacterDashboard from '../../components/characters/Character';
import { useRouter } from 'next/navigation';
import { useGame } from '../../hooks/game/useGame';
import LoadingScreen from '../../components/game/screens/LoadingScreen';
import ErrorScreen from '../../components/game/screens/ErrorScreen';
import { isValidCharacterId } from '../../utils/getCharacterLocalStorageKey';

export default function CharacterPage() {
  const game = useGame();
  const router = useRouter();

  useEffect(() => {
    if (!game.isLoading) {
      if (!game.hasWallet) {
        console.log("CharacterPage: No wallet detected, redirecting to /...");
        router.push('/');
      } else if (game.error) {
        console.log("CharacterPage: Game error detected, redirecting to /...");
        router.push('/');
      } else if (game.needsSessionKeyUpdate) {
        console.log("CharacterPage: Session key needs update, redirecting to /...");
        router.push('/');
      } else if (!isValidCharacterId(game.characterId)) {
        console.log("CharacterPage: No valid character ID found, redirecting to /...");
        router.push('/');
      }
    }
  }, [game.isLoading, game.hasWallet, game.error, game.characterId, game.needsSessionKeyUpdate, router]);

  if (game.isLoading || (!game.hasWallet && !game.error) || (game.hasWallet && game.characterId === null)) {
    return <LoadingScreen message="Loading Character Data..." />;
  }

  if (game.error) {
    return <ErrorScreen error={game.error?.message || 'An unknown error occurred'} retry={() => window.location.reload()} onGoToLogin={() => router.push('/')} />;
  }

  if (game.hasWallet && isValidCharacterId(game.characterId) && !game.needsSessionKeyUpdate) {
    return (
      <Box className="min-h-screen bg-gray-900">
        <NavBar />
        <Box pt="60px">
          <CharacterDashboard />
        </Box>
      </Box>
    );
  }

  console.log("CharacterPage: Waiting for redirect or state clarification...");
  return <LoadingScreen message="Verifying state..." />;
} 