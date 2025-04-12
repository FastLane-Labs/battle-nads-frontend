'use client';

import React, { useState, useEffect } from 'react';
import { Box, Flex, Button, HStack, Text, useColorMode, Badge, Tooltip, Spinner, Image } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '../providers/WalletProvider';
import { useBattleNads } from '../hooks/useBattleNads';

const NavBar: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { login } = usePrivy();
  const { 
    address, 
    logout,
    injectedWallet,
    embeddedWallet
  } = useWallet();
  const { hasPlayerCharacter, loading: characterLoading } = useBattleNads();
  const pathname = usePathname();
  const router = useRouter();
  
  // State to track if user has a character
  const [hasCharacter, setHasCharacter] = useState<boolean>(false);
  
  // Check if user has a character when component mounts or address changes
  useEffect(() => {
    let isMounted = true;
    
    const checkCharacter = async () => {
      try {
        if (!address) {
          if (isMounted) setHasCharacter(false);
          return;
        }
        
        const playerHasCharacter = await hasPlayerCharacter();
        
        if (isMounted) {
          setHasCharacter(playerHasCharacter);
        }
      } catch (error) {
        console.error("Error checking for character:", error);
        if (isMounted) {
          setHasCharacter(false);
        }
      }
    };
    
    checkCharacter();
    
    return () => {
      isMounted = false;
    };
  }, [address, hasPlayerCharacter]);

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
                </Box>
              ) : (
                /* Only show Create link if user doesn't have a character */
                !hasCharacter && (
                  <Link href="/create">
                    <Text
                      px={3}
                      py={2}
                      rounded="md"
                      fontWeight={isActive('/create') ? 'bold' : 'normal'}
                      bg={isActive('/create') ? 'blue.500' : 'transparent'}
                      color={isActive('/create') ? 'white' : undefined}
                      _hover={{ bg: colorMode === 'dark' ? 'blue.700' : 'blue.100' }}
                      cursor="pointer"
                    >
                      Create
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