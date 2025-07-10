'use client';

import React, { useRef } from 'react';
import { 
  HStack, 
  Text, 
  Badge, 
  Tooltip, 
  Spinner, 
  Image, 
  useClipboard, 
  Menu, 
  MenuButton, 
  MenuList, 
  MenuItem, 
  MenuDivider, 
  useDisclosure,
  Button 
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon, ChevronDownIcon } from '@chakra-ui/icons';
interface WalletInfo {
  type: string;
  walletClientType?: string;
  address: string | null;
  signer: any | null;
  provider: any | null;
  privyWallet: any | null;
}

interface AccountMenuProps {
  injectedWallet?: WalletInfo;
  embeddedWallet?: WalletInfo;
  canDeactivate: boolean;
  isDeactivating: boolean;
  onDeactivateSession: () => void;
  onLogout: () => void;
}

const AccountMenu: React.FC<AccountMenuProps> = ({
  injectedWallet,
  embeddedWallet,
  canDeactivate,
  isDeactivating,
  onDeactivateSession,
  onLogout
}) => {
  const { onCopy: onCopyEmbedded, hasCopied: hasCopiedEmbedded } = useClipboard(embeddedWallet?.address ?? '');
  const { onCopy: onCopyInjected, hasCopied: hasCopiedInjected } = useClipboard(injectedWallet?.address ?? '');
  
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isOpen, onClose, onOpen } = useDisclosure();
  
  const formatWalletType = (type?: string): string => {
    if (!type) return '';
    
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
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
    }, 450); // 450ms delay
  };

  return (
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
            onClick={onDeactivateSession} 
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
          <MenuItem onClick={onLogout} className='!bg-transparent'>
            Disconnect
          </MenuItem>
        </Tooltip>
      </MenuList>
    </Menu>
  );
};

export default AccountMenu;