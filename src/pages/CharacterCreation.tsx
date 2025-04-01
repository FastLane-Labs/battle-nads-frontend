import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Heading, 
  Button, 
  Center, 
  FormControl, 
  FormLabel, 
  Input, 
  NumberInput, 
  NumberInputField, 
  NumberInputStepper, 
  NumberIncrementStepper, 
  NumberDecrementStepper,
  VStack,
  Text,
  Spinner,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Image,
  useDisclosure,
  Modal, 
  ModalOverlay, 
  ModalContent, 
  ModalHeader, 
  ModalFooter, 
  ModalBody, 
  ModalCloseButton,
  HStack,
  Stack
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useBattleNads } from '../hooks/useBattleNads';
import { useWallet } from '../providers/WalletProvider';
import WalletConnector from '../components/WalletConnector';

const CharacterCreation: React.FC = () => {
  const [name, setName] = useState('');
  const [strength, setStrength] = useState(3);
  const [vitality, setVitality] = useState(3);
  const [dexterity, setDexterity] = useState(3);
  const [quickness, setQuickness] = useState(3);
  const [sturdiness, setSturdiness] = useState(3);
  const [luck, setLuck] = useState(3);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingStage, setCreatingStage] = useState<'preparing' | 'transaction' | 'lookingUp' | 'complete'>('preparing');
  const [transactionHash, setTransactionHash] = useState<string | null>(() => {
    // Try to get from localStorage on mount
    return localStorage.getItem('lastCharacterCreationTx') || null;
  });
  
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    createCharacter, 
    loading, 
    error, 
    characterId,
    getCharacterIdByTransactionHash 
  } = useBattleNads();
  
  const { ownerWallet, sessionWallet, currentWallet } = useWallet();
  // Check if owner wallet is connected - that's all we need for character creation
  const isMetamaskConnected = ownerWallet.connected;
  
  // Check if character already exists and redirect if it does
  useEffect(() => {
    const storedCharacterId = localStorage.getItem('battleNadsCharacterId');
    if (storedCharacterId) {
      console.log("Found existing character, redirecting to game:", storedCharacterId);
      navigate('/game');
    }
  }, [navigate]);
  
  // Check if character was created and redirect to game
  useEffect(() => {
    if (characterId) {
      console.log("Character ID found, redirecting to game:", characterId);
      navigate('/game');
    }
  }, [characterId, navigate]);
  
  const MIN_STAT_VALUE = 3;
  const TOTAL_POINTS = 32;
  const BASE_POINTS_USED = MIN_STAT_VALUE * 6; // 6 attributes starting at 3 each
  const usedPoints = strength + vitality + dexterity + quickness + sturdiness + luck;
  const unallocatedPoints = TOTAL_POINTS - usedPoints;
  
  const handleTransactionLookup = async () => {
    if (!transactionHash) {
      toast({
        title: 'Error',
        description: 'Please enter a transaction hash',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      const foundCharacterId = await getCharacterIdByTransactionHash(transactionHash);
      
      if (foundCharacterId) {
        toast({
          title: 'Success',
          description: `Found character ID: ${foundCharacterId}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Should navigate automatically via useEffect
      } else {
        toast({
          title: 'Error',
          description: 'Could not find character ID for this transaction',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    onClose();
  };
  
  const handleCreateCharacter = async () => {
    if (!name) {
      toast({
        title: 'Error',
        description: 'Please enter a character name',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (unallocatedPoints !== 0) {
      toast({
        title: 'Error',
        description: `Character attributes must total exactly ${TOTAL_POINTS} points. You currently have ${usedPoints} allocated (${unallocatedPoints} remaining).`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (!isMetamaskConnected) {
      toast({
        title: 'Error',
        description: 'Please connect your Metamask wallet for character creation',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsCreating(true);
    setCreatingStage('preparing');
    
    try {
      console.log("Creating character...");
      console.log(`Character stats: Name: ${name}, STR: ${strength}, VIT: ${vitality}, DEX: ${dexterity}, QUI: ${quickness}, STU: ${sturdiness}, LUK: ${luck}, Total: ${usedPoints}`);
      
      setCreatingStage('transaction');
      
      // Call the createCharacter function from the hook
      const characterId = await createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck,
        (stage) => setCreatingStage(stage)
      );
      
      if (characterId) {
        setCreatingStage('complete');
        toast({
          title: 'Success',
          description: 'Character created successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Navigation will happen via useEffect
      } else {
        // Transaction succeeded but couldn't find character ID
        setCreatingStage('lookingUp');
        
        // Wait to see if the ID is found after retries
        await new Promise(resolve => setTimeout(resolve, 21000)); // Wait for all 3 lookup attempts (20s) plus a bit more
        
        // If we're still on this page, character wasn't found after retries
        if (!characterId) {
          setIsCreating(false);
          setCreatingStage('preparing');
          
          toast({
            title: 'Character Created',
            description: 'Your character was created, but you need to lookup the ID manually using your transaction hash.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } catch (err: any) {
      console.error("Error creating character:", err);
      
      setCreatingStage('preparing');
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const AttributeInput = ({ value, onChange, label, isDisabled = false }) => (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <NumberInput 
        value={value} 
        onChange={(_, val) => onChange(val)} 
        min={MIN_STAT_VALUE} 
        max={10}
        isDisabled={isDisabled || isCreating}
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
    </FormControl>
  );
  
  if (loading || isCreating) {
    return (
      <Center height="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text fontSize="xl" fontWeight="bold">
            {creatingStage === 'preparing' && "Preparing character creation..."}
            {creatingStage === 'transaction' && "Creating your character on Monad Testnet..."}
            {creatingStage === 'lookingUp' && "Character created! Looking up character ID..."}
            {creatingStage === 'complete' && "Character created successfully!"}
            {!isCreating && "Loading..."}
          </Text>
          
          {creatingStage === 'lookingUp' && (
            <Text color="gray.400" fontSize="sm" textAlign="center">
              This can take up to 20 seconds while the blockchain indexes your character.
              <br />
              Please be patient...
            </Text>
          )}
          
          {creatingStage === 'transaction' && (
            <Text color="gray.400" fontSize="sm" textAlign="center">
              Please approve the transaction in your MetaMask wallet if prompted.
            </Text>
          )}
        </VStack>
      </Center>
    );
  }
  
  return (
    <Center height="100vh">
      <Stack 
        direction={{ base: 'column', md: 'row' }} 
        spacing={6} 
        align="center" 
        justify="center" 
        width="100%"
        maxWidth="1200px"
        p={4}
      >
        <WalletConnector showTitle={true} />
        
        <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
          <VStack spacing={6}>
            <Image 
              src="/BattleNadsLogo.png" 
              alt="Battle Nads Logo"
              maxWidth="250px" 
              mb={2}
            />
            
            <Heading as="h1" size="xl" textAlign="center">Create Character</Heading>
            
            {!isMetamaskConnected && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Metamask Not Connected!</AlertTitle>
                  <AlertDescription>
                    Character creation requires Metamask. Please connect using the Metamask button.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
            
            {isMetamaskConnected && localStorage.getItem('local_session_wallet') && (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Using Local Session Key</AlertTitle>
                  <AlertDescription>
                    You're using a local session key instead of Privy's embedded wallet.
                    This is fine for character creation.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
            
            {transactionHash && !characterId && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Previous Transaction Found</AlertTitle>
                  <AlertDescription>
                    We found a previous character creation transaction, but couldn't detect your character ID.
                    Use the "Lookup by Transaction" button below to retrieve your character.
                  </AlertDescription>
                  <Button 
                    size="sm" 
                    mt={2} 
                    colorScheme="blue" 
                    onClick={onOpen}
                  >
                    Lookup Transaction Now
                  </Button>
                </Box>
              </Alert>
            )}
            
            <Divider />
            
            <FormControl>
              <FormLabel>Character Name</FormLabel>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter your character name"
              />
            </FormControl>
            
            <Alert status={unallocatedPoints > 0 ? "info" : unallocatedPoints < 0 ? "error" : "success"} variant="subtle">
              <AlertIcon />
              <AlertDescription>
                <Text fontWeight="bold">
                  Unallocated Attribute Points: {unallocatedPoints}
                </Text>
              </AlertDescription>
            </Alert>
            
            <AttributeInput 
              value={strength} 
              onChange={setStrength} 
              label="Strength" 
            />
            
            <AttributeInput 
              value={vitality} 
              onChange={setVitality} 
              label="Vitality" 
            />
            
            <AttributeInput 
              value={dexterity} 
              onChange={setDexterity} 
              label="Dexterity" 
            />
            
            <AttributeInput 
              value={quickness} 
              onChange={setQuickness} 
              label="Quickness" 
            />
            
            <AttributeInput 
              value={sturdiness} 
              onChange={setSturdiness} 
              label="Sturdiness" 
            />
            
            <AttributeInput 
              value={luck} 
              onChange={setLuck} 
              label="Luck" 
            />
            
            <Button 
              colorScheme="blue" 
              width="full"
              onClick={handleCreateCharacter}
              isDisabled={unallocatedPoints !== 0 || !name || isCreating || !isMetamaskConnected}
            >
              Create Character
            </Button>
            
            <Button
              variant="outline"
              onClick={onOpen}
              width="full"
            >
              Already Created? Lookup by Transaction
            </Button>
          </VStack>
        </Box>
      </Stack>
      
      {/* Transaction Lookup Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Look Up Character by Transaction</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Transaction Hash</FormLabel>
              <Input
                placeholder="0x..."
                value={transactionHash || ''}
                onChange={(e) => setTransactionHash(e.target.value)}
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleTransactionLookup}>
              Look Up
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Center>
  );
};

export default CharacterCreation; 