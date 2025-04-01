import React, { useEffect } from 'react';
import { 
  Box, 
  Button, 
  Heading, 
  Text, 
  VStack, 
  HStack,
  Icon,
  Badge,
  Divider,
  useColorModeValue,
  Tooltip,
  ButtonGroup,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code
} from '@chakra-ui/react';
import { FaWallet, FaEthereum } from 'react-icons/fa';
import { IoWalletOutline } from 'react-icons/io5';
import { IoWarningOutline } from 'react-icons/io5';
import { useWallet } from '../providers/WalletProvider';
import { usePrivy } from '@privy-io/react-auth';

interface WalletConnectorProps {
  variant?: 'full' | 'compact';
  showTitle?: boolean;
}

const WalletConnector: React.FC<WalletConnectorProps> = ({ 
  variant = 'full',
  showTitle = true 
}) => {
  const { 
    currentWallet, 
    injectedWallet,
    embeddedWallet,
    address, 
    loading, 
    error,
    connectMetamask,
    connectPrivyEmbedded,
    logout
  } = useWallet();

  // Access Privy authentication state to check for problems
  const { authenticated, ready } = usePrivy();
  const [privyError, setPrivyError] = React.useState<boolean>(false);

  const bg = useColorModeValue('gray.100', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Check if any wallet is connected (injected or embedded)
  const isConnected = injectedWallet?.address || embeddedWallet?.address;
  
  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Watch for errors in the console that might indicate Privy authentication problems
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (
        e.error && 
        (e.error.message?.includes('Privy iframe failed to load') ||
         e.error.message?.includes('Exceeded max attempts'))
      ) {
        console.error('Privy authentication error detected in WalletConnector:', e.error);
        setPrivyError(true);
      }
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Check if Privy is taking too long to become ready
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!ready) {
        console.warn('Privy authentication is taking too long to initialize');
        setPrivyError(true);
      }
    }, 5000); // Wait 5 seconds for Privy to initialize

    return () => clearTimeout(timeoutId);
  }, [ready]);

  if (privyError && variant === 'full') {
    return (
      <Box 
        p={4} 
        borderWidth="1px" 
        borderRadius="lg" 
        borderColor="red.300"
        bg={useColorModeValue('red.50', 'red.900')}
        width="100%"
        maxW="400px"
      >
        <VStack spacing={4} align="stretch">
          <HStack>
            <Icon as={IoWarningOutline} color="red.500" boxSize={6} />
            <Heading size="md" color="red.500">Authentication Error</Heading>
          </HStack>

          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Authentication service failed to load</AlertTitle>
              <AlertDescription>
                There was an error initializing the Privy authentication service.
              </AlertDescription>
            </Box>
          </Alert>

          <Text fontSize="sm">
            This might be caused by Content Security Policy restrictions, network issues, or browser extensions.
          </Text>

          <Divider />

          <Button 
            colorScheme="blue" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>

          <Alert status="info" size="sm" borderRadius="md">
            <AlertIcon />
            <Box fontSize="xs">
              <Text fontWeight="bold">You can still try connecting with Metamask</Text>
              <Text>Character creation with Metamask should still work.</Text>
            </Box>
          </Alert>

          <Button 
            leftIcon={<Icon as={FaEthereum} />}
            colorScheme="orange"
            onClick={connectMetamask}
            isLoading={loading}
          >
            Connect with Metamask
          </Button>
        </VStack>
      </Box>
    );
  }

  if (variant === 'compact') {
    return (
      <Box>
        {isConnected ? (
          <HStack spacing={2}>
            <Badge 
              colorScheme={currentWallet === 'injected' ? 'orange' : 'purple'}
              fontSize="sm"
              px={2}
              py={1}
              borderRadius="md"
            >
              <HStack spacing={1}>
                <Icon as={currentWallet === 'injected' ? FaEthereum : IoWalletOutline} />
                <Text fontSize="xs">{formatAddress(address || '')}</Text>
              </HStack>
            </Badge>
            <Button size="sm" variant="outline" onClick={logout}>
              Disconnect
            </Button>
          </HStack>
        ) : privyError ? (
          <ButtonGroup size="sm">
            <Tooltip label="Authentication service error. Metamask should still work.">
              <Button
                leftIcon={<Icon as={FaEthereum} />}
                onClick={connectMetamask}
                isLoading={loading}
                colorScheme="orange"
              >
                Use Metamask
              </Button>
            </Tooltip>
          </ButtonGroup>
        ) : (
          <ButtonGroup size="sm" isAttached variant="outline">
            <Tooltip label="Connect Metamask (Required for Character Creation)">
              <Button
                leftIcon={<Icon as={FaEthereum} />}
                onClick={connectMetamask}
                isLoading={loading}
                colorScheme="orange"
              >
                Metamask
              </Button>
            </Tooltip>
            <Tooltip label="Connect Embedded Wallet (For Game Actions)">
              <Button
                leftIcon={<Icon as={IoWalletOutline} />}
                onClick={connectPrivyEmbedded}
                isLoading={loading}
                colorScheme="purple"
                isDisabled={privyError}
              >
                Embedded
              </Button>
            </Tooltip>
          </ButtonGroup>
        )}
      </Box>
    );
  }

  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      bg={bg}
      width="100%"
      maxW="400px"
    >
      {showTitle && (
        <VStack align="start" mb={4}>
          <Heading size="md">Wallet Connection</Heading>
          <Text fontSize="sm" color="gray.500">
            Connect your wallet to interact with Battle Nads
          </Text>
        </VStack>
      )}

      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <VStack spacing={4} align="stretch">
        {isConnected ? (
          <>
            <Box>
              <HStack justify="space-between">
                <Text fontWeight="bold">Connected Wallets:</Text>
              </HStack>
              
              {injectedWallet?.address && (
                <HStack mt={2}>
                  <Badge colorScheme="orange">Metamask</Badge>
                  <Text fontSize="sm">{injectedWallet.address.substring(0, 6)}...{injectedWallet.address.substring(injectedWallet.address.length - 4)}</Text>
                </HStack>
              )}
              
              {embeddedWallet?.address && (
                <HStack mt={2}>
                  <Badge colorScheme="purple">Session Key</Badge>
                  <Text fontSize="sm">{embeddedWallet.address.substring(0, 6)}...{embeddedWallet.address.substring(embeddedWallet.address.length - 4)}</Text>
                </HStack>
              )}
              
              {localStorage.getItem('local_session_wallet') && (
                <Badge mt={2} colorScheme="blue">Using Local Session Key</Badge>
              )}
            </Box>
            <Button colorScheme="red" onClick={logout} size="md">
              Disconnect Wallet
            </Button>
          </>
        ) : (
          <>
            <Tooltip hasArrow label="Use Metamask for character creation">
              <Button 
                leftIcon={<Icon as={FaEthereum} />}
                colorScheme="orange"
                onClick={connectMetamask}
                isLoading={loading}
                mb={2}
                height="50px"
              >
                Connect with Metamask
              </Button>
            </Tooltip>
            
            {privyError ? (
              <Alert status="error" borderRadius="md" mb={2}>
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Embedded wallet unavailable</AlertTitle>
                  <AlertDescription fontSize="xs">
                    Authentication service failed to load. Please use Metamask.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <Tooltip hasArrow label="Use embedded wallet for game actions">
                <Button 
                  leftIcon={<Icon as={IoWalletOutline} />}
                  colorScheme="purple"
                  onClick={connectPrivyEmbedded}
                  isLoading={loading}
                  height="50px"
                  isDisabled={privyError}
                >
                  Connect Embedded Wallet
                </Button>
              </Tooltip>
            )}
            
            <Divider my={2} />
            <Text fontSize="xs" color="gray.500" textAlign="center">
              ⚠️ For character creation, use Metamask.<br />
              For game actions, use the embedded wallet.
            </Text>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default WalletConnector; 