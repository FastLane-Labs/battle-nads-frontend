import { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  HStack,
  Badge,
  useColorModeValue,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useToast,
} from '@chakra-ui/react';
import { ChevronDownIcon, CopyIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../providers/WalletProvider';

const NavBar: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    currentWallet,
    address,
    logout,
    sessionKey,
  } = useWallet();

  const bgColor = useColorModeValue('gray.800', 'gray.900');
  const borderColor = useColorModeValue('gray.700', 'gray.700');

  const copyToClipboard = (text: string, type: string = 'Address') => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${type} copied`,
      status: 'success',
      duration: 2000,
      isClosable: true,
      position: 'top',
    });
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleLogout = async () => {
    try {
      // Clear local storage for character
      localStorage.removeItem('battleNadsCharacterId');
      await logout();
      navigate('/');
      toast({
        title: 'Logged out successfully',
        status: 'success',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: 'Logout failed',
        status: 'error',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
    }
  };

  return (
    <Box
      as="nav"
      position="fixed"
      w="100%"
      zIndex={10}
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={4}
      py={2}
    >
      <Flex justify="space-between" align="center" maxW="1200px" mx="auto">
        <Text
          fontWeight="bold"
          fontSize="xl"
          cursor="pointer"
          onClick={() => navigate('/game')}
        >
          Battle Nads
        </Text>

        {address ? (
          <HStack spacing={4}>
            <Tooltip label={`Connected via: ${currentWallet}`} hasArrow placement="bottom">
              <Badge 
                colorScheme="purple" 
                p={1} 
                cursor={currentWallet === 'embedded' && sessionKey ? 'pointer' : 'default'}
                onClick={() => currentWallet === 'embedded' && sessionKey && copyToClipboard(sessionKey, 'Session Key')}
                display="flex"
                alignItems="center"
              >
                {currentWallet === 'metamask' ? 'MetaMask' : currentWallet === 'embedded' && sessionKey ? (
                  <Tooltip label="Click to copy session key" hasArrow placement="top">
                    <Flex align="center">
                      <Text mr={1}>Session Key:</Text>
                      <Text>{shortenAddress(sessionKey)}</Text>
                      <CopyIcon ml={1} fontSize="xs" />
                    </Flex>
                  </Tooltip>
                ) : 'none'}
              </Badge>
            </Tooltip>
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                rightIcon={<ChevronDownIcon />}
                colorScheme="blue"
                variant="outline"
              >
                {shortenAddress(address)}
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => copyToClipboard(address)}>
                  <HStack>
                    <CopyIcon />
                    <Text>Copy Address</Text>
                  </HStack>
                </MenuItem>

                <MenuDivider />
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        ) : (
          <Text fontSize="sm">Not Connected</Text>
        )}
      </Flex>
    </Box>
  );
};

export default NavBar; 