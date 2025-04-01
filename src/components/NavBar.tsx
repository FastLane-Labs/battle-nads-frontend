'use client';

import React from 'react';
import { Box, Flex, Button, HStack, Text, useColorMode, Badge, Tooltip, VStack } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletProvider';

const NavBar: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { login } = usePrivy();
  const { 
    address, 
    logout,
    injectedWallet,
    embeddedWallet,
    sessionKey
  } = useWallet();
  const pathname = usePathname();

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
        justifyContent="space-between"
        maxW="7xl"
        mx="auto"
        px={4}
      >
        <HStack spacing={8} alignItems="center">
          <Box fontWeight="bold" fontSize="xl">
            <Link href="/">
              <Text cursor="pointer">Battle-Nads</Text>
            </Link>
          </Box>

          {address && (
            <HStack as="nav" spacing={4} display={{ base: 'none', md: 'flex' }}>
              <Link href="/dashboard">
                <Text
                  px={2}
                  py={1}
                  rounded="md"
                  fontWeight={isActive('/dashboard') ? 'bold' : 'normal'}
                  bg={isActive('/dashboard') ? 'blue.500' : 'transparent'}
                  color={isActive('/dashboard') ? 'white' : undefined}
                  _hover={{ bg: colorMode === 'dark' ? 'blue.700' : 'blue.100' }}
                  cursor="pointer"
                >
                  Dashboard
                </Text>
              </Link>
              <Link href="/character">
                <Text
                  px={2}
                  py={1}
                  rounded="md"
                  fontWeight={isActive('/character') ? 'bold' : 'normal'}
                  bg={isActive('/character') ? 'blue.500' : 'transparent'}
                  color={isActive('/character') ? 'white' : undefined}
                  _hover={{ bg: colorMode === 'dark' ? 'blue.700' : 'blue.100' }}
                  cursor="pointer"
                >
                  Character Dashboard
                </Text>
              </Link>
              <Link href="/create">
                <Text
                  px={2}
                  py={1}
                  rounded="md"
                  fontWeight={isActive('/create') ? 'bold' : 'normal'}
                  bg={isActive('/create') ? 'blue.500' : 'transparent'}
                  color={isActive('/create') ? 'white' : undefined}
                  _hover={{ bg: colorMode === 'dark' ? 'blue.700' : 'blue.100' }}
                  cursor="pointer"
                >
                  Create Character
                </Text>
              </Link>
              <Link href="/game">
                <Text
                  px={2}
                  py={1}
                  rounded="md"
                  fontWeight={isActive('/game') ? 'bold' : 'normal'}
                  bg={isActive('/game') ? 'blue.500' : 'transparent'}
                  color={isActive('/game') ? 'white' : undefined}
                  _hover={{ bg: colorMode === 'dark' ? 'blue.700' : 'blue.100' }}
                  cursor="pointer"
                >
                  Game
                </Text>
              </Link>
            </HStack>
          )}
        </HStack>

        <HStack spacing={4}>
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
              <Button colorScheme="red" size="sm" onClick={logout}>
                Disconnect
              </Button>
            </HStack>
          )}
          
          {/* Darkmode Toggle - All the way to the right */}
          <Button onClick={toggleColorMode} size="sm">
            {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};

export default NavBar; 