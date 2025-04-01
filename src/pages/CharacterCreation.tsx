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
  ModalCloseButton
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useBattleNads } from '../hooks/useBattleNads';

const CharacterCreation: React.FC = () => {
  const [name, setName] = useState('');
  const [strength, setStrength] = useState(3);
  const [vitality, setVitality] = useState(3);
  const [dexterity, setDexterity] = useState(3);
  const [quickness, setQuickness] = useState(3);
  const [sturdiness, setSturdiness] = useState(3);
  const [luck, setLuck] = useState(3);
  const [isCreating, setIsCreating] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
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
        description: `Please allocate all attribute points. You have ${unallocatedPoints} points unallocated.`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      console.log("Creating character...");
      // Call the createCharacter function from the hook
      const characterId = await createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );
      
      console.log("Character creation result:", characterId);
      
      if (characterId) {
        toast({
          title: 'Success',
          description: 'Character created successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Navigation will happen via useEffect
      } else {
        toast({
          title: 'Error',
          description: error || 'Failed to create character',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      console.error("Error creating character:", err);
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
      <Center height="100vh" bg="#242938" color="white">
        <VStack spacing={6}>
          <Heading as="h1" size="xl" color="white" mb={2}>Battle Nads</Heading>
          <Spinner size="xl" thickness="4px" speed="0.8s" color="blue.500" />
          <Text fontSize="xl" color="white">
            {isCreating ? "Creating your character on the Monad Testnet..." : 
             "Loading character data..."}
          </Text>
        </VStack>
      </Center>
    );
  }
  
  return (
    <Center height="100vh">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <VStack spacing={6}>
          <Image 
            src="/BattleNadsLogo.png" 
            alt="Battle Nads Logo"
            maxWidth="250px" 
            mb={2}
          />
          
          <Heading as="h1" size="xl" textAlign="center">Create Character</Heading>
          
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
            isDisabled={unallocatedPoints !== 0 || !name || isCreating}
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