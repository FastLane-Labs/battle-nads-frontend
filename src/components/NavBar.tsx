'use client';

import React from 'react';
import { Box, Flex, Button, HStack, Text, useColorMode, Badge, Tooltip, Spinner, Image, useClipboard, IconButton } from '@chakra-ui/react';
import { MoonIcon, SunIcon, CopyIcon, CheckIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@/providers/WalletProvider';
import { useGame } from '@/hooks/game/useGame';
import { isValidCharacterId } from '@/utils/getCharacterLocalStorageKey';
import { useSessionFunding } from '@/hooks/session/useSessionFunding';

const NavBar: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const { login } = usePrivy();
  const {
    logout,
    injectedWallet,
    embeddedWallet
  } = useWallet();
  
  const { 
    isLoading,
    characterId,
    hasWallet,
    sessionKeyData
  } = useGame();
  
  const { 
    deactivateKey, 
    isDeactivating 
  } = useSessionFunding(characterId);
  
  const pathname = usePathname();
  const router = useRouter();

  const hasCharacter = characterId ? isValidCharacterId(characterId) : false;
  const sessionKeyAddress = sessionKeyData?.key;
  const canDeactivate = !!sessionKeyAddress && sessionKeyAddress !== '0x0000000000000000000000000000000000000000';

  const { onCopy: onCopyEmbedded, hasCopied: hasCopiedEmbedded } = useClipboard(embeddedWallet?.address ?? '');
  const { onCopy: onCopyInjected, hasCopied: hasCopiedInjected } = useClipboard(injectedWallet?.address ?? '');

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
            {hasCharacter && hasWallet && pathname !== '/game' && pathname !== '/game-v2' ? (
              <Link href="/game">
                <Image src="/BattleNadsLogo.png" alt="Battle-Nads Logo" height="40px" />
              </Link>
            ) : (!hasCharacter && hasWallet) || pathname === '/game' || pathname === '/game-v2' ? (
              pathname === '/game' || pathname === '/game-v2' ? (
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
                {embeddedWallet?.address && (
                   <Tooltip 
                     label={
                       <HStack spacing={1}>
                         <Text>{hasCopiedEmbedded ? 'Copied!' : 'Copy Session Key'}</Text>
                         {hasCopiedEmbedded ? <CheckIcon color="green.500" /> : <CopyIcon />}
                       </HStack>
                     } 
                     closeOnClick={false}
                     placement="bottom"
                   >
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={onCopyEmbedded} 
                       height="auto" 
                       p={1}
                     >
                        <HStack spacing={1}> 
                          <Badge colorScheme="green" fontSize="xs">SESSION KEY</Badge>
                          <Text fontSize="sm" fontFamily="monospace">
                            {`${embeddedWallet.address.slice(0, 6)}...${embeddedWallet.address.slice(-4)}`}
                          </Text>
                        </HStack>
                      </Button>
                   </Tooltip>
                )}
                {injectedWallet?.address && (
                  <Tooltip 
                     label={
                       <HStack spacing={1}>
                         <Text>{hasCopiedInjected ? 'Copied!' : `Copy ${formatWalletType(injectedWallet.walletClientType)}`}</Text>
                         {hasCopiedInjected ? <CheckIcon color="green.500" /> : <CopyIcon />}
                       </HStack>
                     }
                     closeOnClick={false} 
                     placement="bottom"
                   >
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={onCopyInjected} 
                       height="auto" 
                       p={1}
                      >
                        <HStack spacing={1}>
                          <Badge colorScheme="blue" fontSize="xs">{formatWalletType(injectedWallet.walletClientType).toUpperCase()}</Badge>
                          <Text fontSize="sm" fontFamily="monospace">
                            {`${injectedWallet.address.slice(0, 6)}...${injectedWallet.address.slice(-4)}`}
                          </Text>
                        </HStack>
                      </Button>
                   </Tooltip>
                )}
              </HStack>
              
              <Tooltip label="Disable session key for game actions" placement="bottom">
                <span>
                  <Button 
                    colorScheme="orange" 
                    size="sm" 
                    onClick={() => deactivateKey()} 
                    isLoading={isDeactivating}
                    isDisabled={!canDeactivate || isDeactivating}
                    ml={2}
                  >
                    Deactivate Session
                  </Button>
                </span>
              </Tooltip>

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