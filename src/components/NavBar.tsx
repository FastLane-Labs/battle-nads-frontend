'use client';

import React, { useRef } from 'react';
import { Box, Flex, Button, HStack, Text, useColorMode, Badge, Tooltip, Spinner, Image, useClipboard, Menu, MenuButton, MenuList, MenuItem, MenuDivider, useDisclosure } from '@chakra-ui/react';
import { CopyIcon, CheckIcon, ChevronDownIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/providers/WalletProvider';
import { useSimplifiedGameState } from '@/hooks/game/useSimplifiedGameState';
import { useSessionFunding } from '@/hooks/session/useSessionFunding';

const NavBar: React.FC = () => {
  const { colorMode } = useColorMode();
  const {
    logout,
    injectedWallet,
    embeddedWallet
  } = useWallet();
  
  const { 
    characterId,
    hasWallet,
    sessionKeyData
  } = useSimplifiedGameState();
  
  const { 
    deactivateKey, 
    isDeactivating 
  } = useSessionFunding(characterId);
  
  const router = useRouter();
  const sessionKeyAddress = sessionKeyData?.key;
  const canDeactivate = !!sessionKeyAddress && sessionKeyAddress !== '0x0000000000000000000000000000000000000000';

  const { onCopy: onCopyEmbedded, hasCopied: hasCopiedEmbedded } = useClipboard(embeddedWallet?.address ?? '');
  const { onCopy: onCopyInjected, hasCopied: hasCopiedInjected } = useClipboard(injectedWallet?.address ?? '');

  
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

  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isOpen, onClose, onOpen } = useDisclosure();

  const handleCopyWithDelay = (copyFn: () => void) => {
    // Clear any existing timeout
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    
    // Execute the copy
    copyFn();
    
    // Set a timeout to close the menu after delay
    menuTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 450); // 1 second delay
  };

  return (
    <Box
      position="fixed"
      as="nav"
      w="100%"
      // boxShadow="md"
      zIndex={10}
      className='bg-gray-950/50 border-b border-gray-600/30'
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
            <Link href="/">
              <Image src="/BattleNadsLogo.png" alt="Battle-Nads Logo" height="40px" />
            </Link>
          </Box>

        </Flex>

        <Flex justifyContent="flex-end" alignItems="center">
          {hasWallet && (
            <Menu isOpen={isOpen} onClose={onClose} onOpen={onOpen}>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline" size="md">
                {injectedWallet?.address && (
                  <HStack spacing={1}>
                    <Image 
                      src="/assets/icons/avatar.png" 
                      alt="User Avatar" 
                      boxSize="20px" 
                      borderRadius="full"
                      mr={1}
                    />
                    <Text fontSize="sm" className='gold-text tracking-tight'>
                      {`${injectedWallet.address.slice(0, 6)}...${injectedWallet.address.slice(-4)}`}
                    </Text>
                  </HStack>
                )}
              </MenuButton>
              <MenuList className='!bg-transparent backdrop-blur-xl'>
                {injectedWallet?.address && (
                  <Tooltip 
                    label={
                      <HStack spacing={1}>
                        <Text>{hasCopiedInjected ? 'Copied!' : `Copy ${formatWalletType(injectedWallet.walletClientType)}`}</Text>
                        {hasCopiedInjected ? <CheckIcon color="green.500" /> : <CopyIcon />}
                      </HStack>
                    }
                    closeOnClick={false}
                    placement="right"
                    hasArrow
                  >
                    <MenuItem 
                      onClick={() => handleCopyWithDelay(onCopyInjected)}
                      closeOnSelect={false}
                      className='!bg-transparent'
                    >
                      <HStack spacing={1}>
                        <Badge colorScheme="blue" fontSize="xs">{formatWalletType(injectedWallet.walletClientType).toUpperCase()}</Badge>
                        <Text fontSize="sm" fontFamily="monospace">
                          {`${injectedWallet.address.slice(0, 6)}...${injectedWallet.address.slice(-4)}`}
                        </Text>
                        {hasCopiedInjected ? (
                          <CheckIcon color="green.500" ml={1} transition="all 0.2s ease-in-out" />
                        ) : (
                          <CopyIcon ml={1} transition="all 0.2s ease-in-out" />
                        )}
                      </HStack>
                    </MenuItem>
                  </Tooltip>
                )}
                
                {embeddedWallet?.address && (
                  <Tooltip 
                    label={
                      <HStack spacing={1}>
                        <Text>{hasCopiedEmbedded ? 'Copied!' : 'Copy Session Key'}</Text>
                        {hasCopiedEmbedded ? <CheckIcon color="green.500" /> : <CopyIcon />}
                      </HStack>
                    }
                    closeOnClick={false}
                    placement="right"
                    hasArrow
                  >
                    <MenuItem 
                      onClick={() => handleCopyWithDelay(onCopyEmbedded)}
                      closeOnSelect={false}
                      className='!bg-transparent'
                    >
                      <HStack spacing={1}>
                        <Badge colorScheme="green" fontSize="xs">SESSION KEY</Badge>
                        <Text fontSize="sm" fontFamily="monospace">
                          {`${embeddedWallet.address.slice(0, 6)}...${embeddedWallet.address.slice(-4)}`}
                        </Text>
                        {hasCopiedEmbedded ? (
                          <CheckIcon color="green.500" ml={1} transition="all 0.2s ease-in-out" />
                        ) : (
                          <CopyIcon ml={1} transition="all 0.2s ease-in-out" />
                        )}
                      </HStack>
                    </MenuItem>
                  </Tooltip>
                )}
                
                <MenuDivider />
                
                <Tooltip 
                  label="Disable session key for game actions"
                  placement="right"
                  hasArrow
                >
                  <MenuItem 
                    onClick={() => deactivateKey(undefined)} 
                    isDisabled={!canDeactivate || isDeactivating}
                    closeOnSelect={false}
                    className='!bg-transparent'
                  >
                    <HStack>
                      <Text>Deactivate Session</Text>
                      {isDeactivating && <Spinner size="sm" ml={2} />}
                    </HStack>
                  </MenuItem>
                </Tooltip>
                
                <Tooltip 
                  label="Disconnect your wallet"
                  placement="right"
                  hasArrow
                >
                  <MenuItem onClick={handleLogout}
                    className='!bg-transparent'

                  >
                    Disconnect
                  </MenuItem>
                </Tooltip>
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default NavBar; 