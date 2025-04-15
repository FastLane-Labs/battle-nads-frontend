'use client';

import React, { useState, useEffect } from 'react';
import { Box, Flex, Button, HStack, Text, useColorMode, Badge, Tooltip, Spinner, Image } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads } from '../hooks/useBattleNads';
import { useGameData } from '../providers/GameDataProvider';
import { isValidCharacterId } from '../utils/getCharacterLocalStorageKey';

const NavBar: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { login } = usePrivy();
  const { 
    address, 
    logout,
    injectedWallet,
    embeddedWallet
  } = useWallet();
  const { characterId, loading: battlenadsLoading } = useBattleNads();
  const { gameData, isLoading: gameDataLoading } = useGameData();
  const pathname = usePathname();
  const router = useRouter();
  
  // Compute loading state combining both sources
  const characterLoading = battlenadsLoading || gameDataLoading;
  
  // State to track if user has a character
  const [hasCharacter, setHasCharacter] = useState<boolean>(false);
  
  // Use both the characterId from useBattleNads and the characterID from gameData
  useEffect(() => {
    // First check the characterId from useBattleNads
    let isValid = isValidCharacterId(characterId);
    
    // Then check the characterID from gameData (may have more up-to-date info)
    if (!isValid && gameData) {
      // Make sure gameData has a characterID property that's a string
      const gameDataCharacterId = gameData.characterID || null;
      
      // Log the character ID for debugging
      console.log(`NavBar: gameData characterID:`, gameDataCharacterId);
      
      // If gameData has a characterID, check if it's valid
      if (gameDataCharacterId) {
        isValid = isValidCharacterId(gameDataCharacterId);
        console.log(`NavBar: Using gameData characterID: ${gameDataCharacterId}, valid: ${isValid}`);
      }
    }
    
    // Add debug logging to help identify issues
    console.log(`NavBar: Character check summary:`, {
      "useBattleNads.characterId": characterId,
      "gameData.characterID": gameData?.characterID,
      "isValidCharacter": isValid
    });
    
    setHasCharacter(isValid);
  }, [characterId, gameData]);

  // Add an effect to listen for character creation events
  useEffect(() => {
    const handleCharacterCreated = (event: CustomEvent) => {
      console.log("NavBar received characterCreated event:", event.detail);
      
      // Force a check to see if the user has a character now
      if (event.detail && event.detail.characterId && isValidCharacterId(event.detail.characterId)) {
        console.log("NavBar: Setting hasCharacter to true from event");
        setHasCharacter(true);
      }
    };

    // Add event listener
    window.addEventListener('characterCreated', handleCharacterCreated as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('characterCreated', handleCharacterCreated as EventListener);
    };
  }, []);
  
  // Add an effect to listen for character ID changes from GameDataProvider
  useEffect(() => {
    const handleCharacterIDChanged = (event: CustomEvent) => {
      console.log("NavBar received characterIDChanged event:", event.detail);
      
      // Update hasCharacter based on new character ID
      if (event.detail && event.detail.characterId && isValidCharacterId(event.detail.characterId)) {
        console.log("NavBar: Setting hasCharacter to true from characterIDChanged event");
        setHasCharacter(true);
      }
    };

    // Add event listener
    window.addEventListener('characterIDChanged', handleCharacterIDChanged as EventListener);
    
    // Also listen for gameDataUpdated events to check character ID
    const handleGameDataUpdated = (event: CustomEvent) => {
      console.log("NavBar received gameDataUpdated event");
      
      // Check if the event detail has a characterID
      if (event.detail && event.detail.characterID && isValidCharacterId(event.detail.characterID)) {
        console.log(`NavBar: Character ID from gameDataUpdated event: ${event.detail.characterID}`);
        setHasCharacter(true);
      }
    };
    
    window.addEventListener('gameDataUpdated', handleGameDataUpdated as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('characterIDChanged', handleCharacterIDChanged as EventListener);
      window.removeEventListener('gameDataUpdated', handleGameDataUpdated as EventListener);
    };
  }, []);

  const isActive = (path: string) => pathname === path;
  
  // Format wallet client type for display
  const formatWalletType = (type?: string): string => {
    if (!type) return '';
    
    // Convert snake_case to Title Case
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Handle logout and redirect to home
  const handleLogout = async () => {
    try {
      // Wait for the logout process to complete
      await logout();
      
      // Add a small delay to ensure all state changes have propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Only navigate after logout is complete
      router.push('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  return (
    <Box
      position="fixed"
      as="nav"
      w="100%"
      bg={colorMode === 'dark' ? 'gray.800' : 'white'}
      boxShadow="md"
      zIndex={10}
    >
      <Flex
        h={16}
        alignItems="center"
        maxW="7xl"
        mx="auto"
        px={6}
      >
        {/* Left side with logo and navigation */}
        <Flex alignItems="center" flex="1">
          <Box mr={6}>
            {hasCharacter && address && pathname !== '/game' ? (
              <Link href="/game">
                <Image src="/BattleNadsLogo.png" alt="Battle-Nads Logo" height="40px" />
              </Link>
            ) : !hasCharacter || !address || pathname === '/game' ? (
              pathname === '/game' ? (
                <Image src="/BattleNadsLogo.png" alt="Battle-Nads Logo" height="40px" />
              ) : (
                <Link href="/">
                  <Image src="/BattleNadsLogo.png" alt="Battle-Nads Logo" height="40px" />
                </Link>
              )
            ) : (
              <Link href="/">
                <Image src="/BattleNadsLogo.png" alt="Battle-Nads Logo" height="40px" />
              </Link>
            )}
          </Box>

          {address && (
            <HStack as="nav" spacing={4} display={{ base: 'none', md: 'flex' }}>
              <Link href="/game">
                <Text
                  px={3}
                  py={2}
                  rounded="md"
                  fontWeight={isActive('/game') ? 'bold' : 'normal'}
                  bg={isActive('/game') ? 'blue.500' : 'transparent'}
                  color={isActive('/game') ? 'white' : undefined}
                  _hover={{ bg: colorMode === 'dark' ? 'blue.700' : 'blue.100' }}
                  cursor="pointer"
                  fontSize="md"
                >
                  Game
                </Text>
              </Link>
              {/* Show loading spinner while checking character - use characterLoading from hook */}
              {characterLoading ? (
                <Box px={3} py={2}>
                  <Spinner size="sm" color="blue.500" />
                  <Text fontSize="xs" color="gray.500" ml={1}>Loading character...</Text>
                </Box>
              ) : (
                /* Show Create link if user doesn't have a character AND we're done loading */
                !hasCharacter && (
                  <Link href="/create">
                    <Text
                      px={3}
                      py={2}
                      rounded="md"
                      fontWeight="bold" // Always bold to make it prominent
                      bg={isActive('/create') ? 'blue.500' : 'transparent'}
                      color={isActive('/create') ? 'white' : undefined}
                      _hover={{ bg: colorMode === 'dark' ? 'blue.700' : 'blue.100' }}
                      cursor="pointer"
                    >
                      Create Character
                    </Text>
                  </Link>
                )
              )}
            </HStack>
          )}
        </Flex>

        {/* Right side with wallet info and buttons */}
        <Flex justifyContent="flex-end" alignItems="center">
          {!address ? (
            <Button colorScheme="blue" size="sm" onClick={() => login()}>
              Connect Wallet
            </Button>
          ) : (
            <HStack spacing={4}>
              {/* Wallet Display Section - Horizontal layout */}
              <HStack spacing={3}>
                {/* Display Session Key (with the embedded wallet address) */}
                {embeddedWallet && (
                  <Tooltip label="Session Key for Account Abstraction" placement="bottom">
                    <HStack>
                      <Badge colorScheme="green" fontSize="xs">SESSION KEY</Badge>
                      <Text fontSize="sm" fontFamily="monospace">
                        {`${embeddedWallet.address?.slice(0, 6)}...${embeddedWallet.address?.slice(-4)}`}
                      </Text>
                    </HStack>
                  </Tooltip>
                )}

                {/* Display Injected Wallet (e.g. MetaMask) */}
                {injectedWallet && (
                  <Tooltip label={`${formatWalletType(injectedWallet.walletClientType)} Wallet`} placement="bottom">
                    <HStack>
                      <Badge colorScheme="blue" fontSize="xs">{formatWalletType(injectedWallet.walletClientType).toUpperCase()}</Badge>
                      <Text fontSize="sm" fontFamily="monospace">
                        {`${injectedWallet.address?.slice(0, 6)}...${injectedWallet.address?.slice(-4)}`}
                      </Text>
                    </HStack>
                  </Tooltip>
                )}
              </HStack>
              
              {/* Logout Button - Next to toggle */}
              <Button colorScheme="red" size="sm" onClick={handleLogout}>
                Disconnect
              </Button>
            </HStack>
          )}
          
          {/* Darkmode Toggle - All the way to the right */}
          <Button onClick={toggleColorMode} size="sm" ml={4}>
            {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default NavBar; 