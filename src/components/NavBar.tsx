import { useState, useEffect } from 'react';
import { 
  Box, 
  Flex, 
  Text, 
  Button, 
  HStack, 
  Badge, 
  useColorModeValue,
  Tooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  VStack
} from '@chakra-ui/react';
import { ChevronDownIcon, CopyIcon } from '@chakra-ui/icons';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { useBattleNads } from '../hooks/useBattleNads';

const NavBar: React.FC = () => {
  const { user, authenticated, logout } = usePrivy();
  const navigate = useNavigate();
  const toast = useToast();
  const [embeddedWalletAddress, setEmbeddedWalletAddress] = useState<string | null>(null);
  const [customSessionKey, setCustomSessionKey] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { updateSessionKey, loading } = useBattleNads();
  
  const bgColor = useColorModeValue('gray.800', 'gray.900');
  const borderColor = useColorModeValue('gray.700', 'gray.700');
  
  // Get embedded wallet address
  useEffect(() => {
    const getEmbeddedWallet = async () => {
      if (authenticated && user) {
        try {
          // Get the embedded wallet - in this implementation we're using the same EOA wallet
          // This would be replaced with the actual embedded wallet when available
          if (user.wallet?.address) {
            setEmbeddedWalletAddress(user.wallet.address);
          }
        } catch (error) {
          console.error("Error fetching embedded wallet:", error);
        }
      }
    };
    
    getEmbeddedWallet();
  }, [authenticated, user]);
  
  const handleLogout = async () => {
    try {
      // Clear local storage
      localStorage.removeItem('battleNadsCharacterId');
      
      // Logout from Privy
      await logout();
      
      // Redirect to login page
      navigate('/');
      
      // Show logout confirmation
      toast({
        title: "Logged out successfully",
        status: "success",
        duration: 2000,
        isClosable: true,
        position: "top"
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top"
      });
    }
  };
  
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Address copied",
      status: "success",
      duration: 2000,
      isClosable: true,
      position: "top"
    });
  };

  const handleUpdateSessionKey = async () => {
    if (!customSessionKey) {
      toast({
        title: "Please enter a session key",
        status: "error",
        duration: 2000,
        isClosable: true
      });
      return;
    }

    const success = await updateSessionKey(customSessionKey);
    
    if (success) {
      setEmbeddedWalletAddress(customSessionKey);
      toast({
        title: "Session key updated",
        status: "success",
        duration: 2000,
        isClosable: true
      });
      onClose();
    } else {
      toast({
        title: "Failed to update session key",
        status: "error",
        duration: 2000,
        isClosable: true
      });
    }
  };

  return (
    <>
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
            onClick={() => authenticated ? navigate('/game') : navigate('/')}
          >
            Battle Nads
          </Text>
          
          {authenticated && user?.wallet ? (
            <HStack spacing={4}>
              <Menu>
                <MenuButton
                  as={Button}
                  size="sm"
                  rightIcon={<ChevronDownIcon />}
                  colorScheme="blue"
                  variant="outline"
                >
                  {user.wallet.address ? shortenAddress(user.wallet.address) : 'Wallet'}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => copyToClipboard(user.wallet?.address || '')}>
                    <HStack>
                      <CopyIcon />
                      <Text>Copy EOA Address</Text>
                    </HStack>
                  </MenuItem>
                  {embeddedWalletAddress && embeddedWalletAddress !== user.wallet?.address && (
                    <MenuItem onClick={() => copyToClipboard(embeddedWalletAddress)}>
                      <HStack>
                        <CopyIcon />
                        <Text>Copy Session Key</Text>
                      </HStack>
                    </MenuItem>
                  )}
                  <MenuItem onClick={onOpen}>
                    <HStack>
                      <CopyIcon />
                      <Text>Update Session Key</Text>
                    </HStack>
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={handleLogout}>Logout</MenuItem>
                </MenuList>
              </Menu>
              {embeddedWalletAddress && (
                <Tooltip 
                  label={`Session Key: ${embeddedWalletAddress}`} 
                  hasArrow 
                  placement="bottom"
                >
                  <Badge colorScheme="purple" p={1}>
                    Session Key
                  </Badge>
                </Tooltip>
              )}
              <Button 
                size="sm" 
                colorScheme="red" 
                variant="outline" 
                onClick={handleLogout}
              >
                Logout
              </Button>
            </HStack>
          ) : (
            <Text fontSize="sm">Not Connected</Text>
          )}
        </Flex>
      </Box>

      {/* Session Key Update Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color="white">Update Session Key</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Text color="white">
                Enter a new session key address to use for your Battle Nads character.
              </Text>
              <Input
                placeholder="0x..."
                value={customSessionKey}
                onChange={(e) => setCustomSessionKey(e.target.value)}
                color="white"
              />
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleUpdateSessionKey} isLoading={loading}>
              Update
            </Button>
            <Button variant="ghost" onClick={onClose} color="white">
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default NavBar; 