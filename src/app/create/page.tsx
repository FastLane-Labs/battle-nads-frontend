'use client';

import React, { useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/hooks/game/useGame';
import { isValidCharacterId } from '../../utils/getCharacterLocalStorageKey';

import NavBar from '@/components/NavBar';
import LoadingScreen from '@/components/game/screens/LoadingScreen';
import ErrorScreen from '@/components/game/screens/ErrorScreen';
import CharacterCreation from '@/components/characters/CharacterCreation';

export default function CreatePage() {
  const game = useGame();
  const router = useRouter();
  const zeroCharacterId = "0x0000000000000000000000000000000000000000000000000000000000000000";

  useEffect(() => {
    if (!game.isLoading) {
      if (!game.hasWallet) {
        console.log("CreatePage: No wallet detected, redirecting to /...");
        router.push('/');
      } else if (game.error) {
        console.log("CreatePage: Game error detected, redirecting to /...");
        router.push('/');
      } else if (isValidCharacterId(game.characterId)) {
        console.log("CreatePage: Character already exists, redirecting to /...");
        router.push('/');
      }
    }
  }, [game.isLoading, game.hasWallet, game.error, game.characterId, router]);

  if (game.isLoading || (!game.hasWallet && !game.error)) {
    return <LoadingScreen message="Loading Character Status..." />;
  }

  if (game.error) {
    return <ErrorScreen error={game.error} retry={() => window.location.reload()} onGoToLogin={() => router.push('/')} />;
  }

  if (game.hasWallet && game.characterId === zeroCharacterId) {
    return (
      <Box className="min-h-screen bg-gray-900">
        <NavBar />
        <Box pt="60px">
          <CharacterCreation />
        </Box>
      </Box>
    );
  }

  return <LoadingScreen message="Verifying state..." />;
} 