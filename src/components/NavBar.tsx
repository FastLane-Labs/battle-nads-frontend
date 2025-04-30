'use client';

import React, { useState, useEffect } from 'react';
import { Box, Flex, Button, HStack, Text, useColorMode, Badge, Tooltip, Spinner, Image } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletProvider';
import { useGame } from '../hooks/game/useGame';
import { isValidCharacterId } from '../utils/getCharacterLocalStorageKey';

const NavBar: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { login, authenticated } = usePrivy();
  const {
    logout,
    injectedWallet,
    embeddedWallet
  } = useWallet();
  
  const { 
    isLoading,
    characterId,
    hasWallet
  } = useGame();
  
  const pathname = usePathname();
  const router = useRouter();

  // Safely check for a valid character ID (handles null/undefined case)
  const hasCharacter = characterId ? isValidCharacterId(characterId) : false;

  useEffect(() => {
    console.log("NavBar Component - Game Hook State:", {
      isLoading,
      characterId,
      hasCharacter,
      hasWallet
    });
  }, [isLoading, characterId, hasCharacter, hasWallet]);

  const isActive = (path: string) => pathname === path;
  
  const formatWalletType = (type?: string): string => {
    if (!type) return '';
    
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      await new Promise(resolve => setTimeout(resolve, 100));
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
        <Flex alignItems="center" flex="1">
          <Box mr={6}>
            {hasCharacter && hasWallet && pathname !== '/game' ? (
              <Link href="/game">
                <Image src="/BattleNadsLogo.png" alt="Battle-Nads Logo" height="40px" />
              </Link>
            ) : (!hasCharacter && hasWallet) || pathname === '/game' ? (
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

          {hasWallet && (
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
                  data-active={isActive('/game')}
                >
                  Game
                </Text>
              </Link>
              {isLoading ? (
                <Box px={3} py={2}>
                  <Spinner size="sm" color="blue.500" />
                  <Text fontSize="xs" color="gray.500" ml={1}>Loading...</Text>
                </Box>
              ) : (
                !hasCharacter && (
                  <Link href="/create">
                    <Text
                      px={3}
                      py={2}
                      rounded="md"
                      fontWeight="bold"
                      bg={isActive('/create') ? 'blue.500' : 'transparent'}
                      color={isActive('/create') ? 'white' : undefined}
                      _hover={{ bg: colorMode === 'dark' ? 'blue.700' : 'blue.100' }}
                      cursor="pointer"
                      data-active={isActive('/create')}
                    >
                      Create Character
                    </Text>
                  </Link>
                )
              )}
            </HStack>
          )}
        </Flex>

        <Flex justifyContent="flex-end" alignItems="center">
          {!hasWallet ? (
            <Button colorScheme="blue" size="sm" onClick={() => login()}>
              Connect Wallet
            </Button>
          ) : (
            <HStack spacing={4}>
              <HStack spacing={3}>
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
              
              <Button colorScheme="red" size="sm" onClick={handleLogout}>
                Disconnect
              </Button>
            </HStack>
          )}
          
          <Button onClick={toggleColorMode} size="sm" ml={4}>
            {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default NavBar; 