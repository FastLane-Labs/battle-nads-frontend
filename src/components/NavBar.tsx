'use client';

import React from 'react';
import { Box, Flex, Image, useColorMode } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/providers/WalletProvider';
import { useCharacterId, useSessionKeyData } from '@/hooks/game/selectors';
import { useSessionFunding } from '@/hooks/session/useSessionFunding';
import { useAuthState } from '@/contexts/AuthStateContext';
import AccountMenu from '@/components/AccountMenu';

const NavBar: React.FC = () => {
  const { colorMode } = useColorMode();
  const authState = useAuthState();
  const {
    logout,
    injectedWallet,
    embeddedWallet
  } = useWallet();
  
  const characterId = useCharacterId();
  const { sessionKeyData } = useSessionKeyData();
  
  const { 
    deactivateKey, 
    isDeactivating 
  } = useSessionFunding(characterId);
  
  const router = useRouter();
  const sessionKeyAddress = sessionKeyData?.key;
  const canDeactivate = !!sessionKeyAddress && sessionKeyAddress !== '0x0000000000000000000000000000000000000000';

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  const handleDeactivateSession = () => {
    deactivateKey(undefined);
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
          {authState.hasWallet && (
            <AccountMenu
              injectedWallet={injectedWallet || undefined}
              embeddedWallet={embeddedWallet || undefined}
              canDeactivate={canDeactivate}
              isDeactivating={isDeactivating}
              onDeactivateSession={handleDeactivateSession}
              onLogout={handleLogout}
            />
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default NavBar; 