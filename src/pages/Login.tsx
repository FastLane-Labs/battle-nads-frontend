import React, { useEffect, useState } from 'react';
import { Box, Heading, Button, Center, VStack, Text, Spinner, Alert, AlertIcon, useToast, Flex, Card, CardBody, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth';
import { useNavigate } from 'react-router-dom';
import { useBattleNads } from '../hooks/useBattleNads';
import { useWallet } from '../providers/WalletProvider';

/**
 * Login component that handles:
 * 1. Connecting wallets through Privy
 * 2. Checking for an existing character
 * 3. Navigating to the appropriate page
 */
const Login = () => {
  const toast = useToast();
  const { login, authenticated, ready: privyReady } = usePrivy();
  const navigate = useNavigate();
  const { getPlayerCharacterID, loading: battleNadsLoading } = useBattleNads();
  
  // Get wallet information from the wallet provider
  const { 
    ownerWallet, 
    sessionWallet, 
    loading: walletLoading
  } = useWallet();
  
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Connect wallet handler
  const handleConnectWallet = async () => {
    setError(null);
    
    try {
      // Use Privy's login method to handle wallet connection
      await login({
        loginMethods: ['wallet'],
        walletChainType: 'ethereum-only'
      });
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
      toast({
        title: "Connection Failed",
        description: err.message || "Could not connect wallet",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  // Check for character when both wallets are connected
  useEffect(() => {
    if (!ownerWallet.connected || !sessionWallet.connected || checking) return;
    
    const checkForExistingCharacter = async () => {
      setChecking(true);
      setError(null);
      
      try {
        // Make sure we have a valid address before checking
        if (!ownerWallet.address) {
          throw new Error("Owner wallet address is not available");
        }
        
        console.log("Checking for character ID associated with owner address:", ownerWallet.address);
        const characterID = await getPlayerCharacterID(ownerWallet.address);
        
        if (characterID) {
          console.log("Character found:", characterID);
          toast({
            title: "Character Found",
            description: "Entering game...",
            status: "success",
            duration: 3000,
            isClosable: true,
          });
          navigate('/game');
        } else {
          console.log("No character found, navigating to character creation");
          toast({
            title: "No Character Found",
            description: "Create your character to start playing",
            status: "info",
            duration: 3000,
            isClosable: true,
          });
          navigate('/create');
        }
      } catch (err: any) {
        console.error("Error checking for character:", err);
        setError(`Character check failed: ${err.message || 'Unknown error'}`);
        toast({
          title: "Character Check Failed",
          description: err.message || "Could not check for existing character",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setChecking(false);
      }
    };
    
    checkForExistingCharacter();
  }, [ownerWallet.connected, sessionWallet.connected, ownerWallet.address, getPlayerCharacterID, navigate, toast]);
  
  // Skip to character creation (emergency fallback)
  const handleSkipToCreation = () => {
    console.log("User requested to skip to character creation");
    navigate('/create');
  };
  
  // Show loading during connection process
  const isLoading = !privyReady || checking || walletLoading || battleNadsLoading;
  
  // Render authentication status and controls
  return (
    <Flex
      h="100vh"
      direction="column"
      justify="center"
      align="center"
      p={4}
      bgGradient="linear(to-b, purple.900, blue.900)"
    >
      <Card
        borderWidth="1px"
        p={6}
        borderRadius="xl"
        maxW="500px"
        w="full"
        bg="gray.800"
        boxShadow="2xl"
      >
        <CardBody>
          <VStack spacing={6}>
            <Heading 
              textAlign="center"
              fontSize="2xl"
              color="white"
              mb={4}
            >
              Battle Nads
            </Heading>
            
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            )}
            
            {isLoading ? (
              <Center p={8}>
                <Spinner size="xl" color="purple.500" thickness="4px" mr={4} />
                <Text color="white">
                  {checking ? "Checking character..." : "Loading..."}
                </Text>
              </Center>
            ) : (
              <>
                {!authenticated ? (
                  // Not authenticated - show connect button
                  <VStack spacing={4} w="full">
                    <Text color="gray.300" textAlign="center">
                      Connect your wallet to start playing
                    </Text>
                    
                    <Button
                      onClick={handleConnectWallet}
                      colorScheme="purple"
                      size="lg"
                      width="full"
                      py={6}
                      fontWeight="bold"
                      bgGradient="linear(to-r, blue.400, purple.500)"
                      _hover={{
                        bgGradient: "linear(to-r, blue.500, purple.600)",
                        transform: "translateY(-2px)",
                        boxShadow: "lg"
                      }}
                    >
                      Connect Wallet
                    </Button>
                  </VStack>
                ) : (
                  // Authenticated - show wallet status
                  <VStack spacing={4} w="full">
                    <Box w="full" p={4} borderRadius="md" borderWidth="1px" borderColor="gray.700">
                      <VStack spacing={4} align="start">
                        <Text color="gray.400" fontSize="sm">Connected Wallets</Text>
                        
                        {ownerWallet.connected && (
                          <Box>
                            <Text color="gray.400" fontSize="xs">Owner Wallet</Text>
                            <Text fontFamily="mono" fontSize="sm">
                              {ownerWallet.address?.substring(0, 10)}...{ownerWallet.address?.substring(ownerWallet.address.length - 8)}
                            </Text>
                          </Box>
                        )}
                        
                        {sessionWallet.connected && (
                          <Box>
                            <Text color="gray.400" fontSize="xs">Session Wallet</Text>
                            <Text fontFamily="mono" fontSize="sm">
                              {sessionWallet.address?.substring(0, 10)}...{sessionWallet.address?.substring(sessionWallet.address.length - 8)}
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                    
                    {ownerWallet.connected && !sessionWallet.connected ? (
                      // Waiting for session wallet - show status and dev bypass
                      <VStack spacing={4} w="full">
                        <Alert status="info" borderRadius="md">
                          <AlertIcon />
                          <Text>
                            Creating session wallet for gas-free play...
                          </Text>
                        </Alert>
                        
                        {/* Development mode bypass */}
                        {import.meta.env.DEV && (
                          <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            <Box>
                              <AlertTitle fontSize="sm">Development Mode</AlertTitle>
                              <AlertDescription fontSize="xs">
                                Privy embedded wallet creation is failing. A local session wallet will be created automatically.
                              </AlertDescription>
                            </Box>
                          </Alert>
                        )}
                        
                        {/* Local session wallet notice */}
                        {localStorage.getItem('local_session_wallet') && (
                          <Alert status="warning" borderRadius="md">
                            <AlertIcon />
                            <Box>
                              <AlertTitle fontSize="sm">Using Local Session Wallet</AlertTitle>
                              <AlertDescription fontSize="xs">
                                Using a locally generated session wallet instead of Privy's embedded wallet.
                              </AlertDescription>
                            </Box>
                          </Alert>
                        )}
                        
                        {/* Skip button with clear development mode messaging */}
                        {import.meta.env.DEV && (
                          <Button 
                            colorScheme="purple" 
                            width="full"
                            onClick={() => navigate('/create')}
                            size="sm"
                          >
                            Development: Skip Session Wallet (Emergency)
                          </Button>
                        )}
                      </VStack>
                    ) : (
                      // Both wallets connected - show continue button
                      <Button
                        colorScheme="green"
                        width="full"
                        onClick={() => {
                          if (ownerWallet.address) {
                            getPlayerCharacterID(ownerWallet.address)
                              .then(characterID => {
                                if (characterID) {
                                  navigate('/game');
                                } else {
                                  navigate('/create');
                                }
                              })
                              .catch(() => navigate('/create'));
                          } else {
                            navigate('/create');
                          }
                        }}
                      >
                        Continue to Game
                      </Button>
                    )}
                    
                    {/* Emergency skip button */}
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={handleSkipToCreation}
                      color="gray.400"
                      mt={4}
                    >
                      Skip to Character Creation
                    </Button>
                  </VStack>
                )}
              </>
            )}
          </VStack>
        </CardBody>
      </Card>
    </Flex>
  );
};

export default Login; 