import React, { useState } from 'react';
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
  Divider
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useBattleNads } from '../hooks/useBattleNads';

const CharacterCreation: React.FC = () => {
  const [name, setName] = useState('');
  const [strength, setStrength] = useState(5);
  const [vitality, setVitality] = useState(5);
  const [dexterity, setDexterity] = useState(5);
  const [quickness, setQuickness] = useState(5);
  const [sturdiness, setSturdiness] = useState(5);
  const [luck, setLuck] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  
  const navigate = useNavigate();
  const toast = useToast();
  const { createCharacter, loading, error } = useBattleNads();
  
  const TOTAL_POINTS = 30;
  const usedPoints = strength + vitality + dexterity + quickness + sturdiness + luck;
  const remainingPoints = TOTAL_POINTS - usedPoints;
  
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
    
    if (remainingPoints !== 0) {
      toast({
        title: 'Error',
        description: `Please allocate all attribute points. You have ${remainingPoints} points remaining.`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      toast({
        title: 'Wallet Connection Required',
        description: 'To create a character on the Monad Testnet, you need to connect your wallet. We are upgrading this feature. Please check back soon.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      
      // Navigate to game page (for demo purposes)
      // In a real implementation, this would only happen after successful character creation
      setTimeout(() => {
        navigate('/game');
      }, 2000);
      
      /* Real Implementation would be:
      const result = await createCharacter(
        name,
        strength,
        vitality,
        dexterity,
        quickness,
        sturdiness,
        luck
      );
      
      if (result) {
        toast({
          title: 'Success',
          description: 'Character created successfully!',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Navigate to game page
        navigate('/game');
      } else {
        toast({
          title: 'Error',
          description: error || 'Failed to create character',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
      */
    } catch (err) {
      toast({
        title: 'Error',
        description: error || 'An unexpected error occurred',
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
        min={1} 
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
          <Text>Creating your character on the Monad Testnet...</Text>
        </VStack>
      </Center>
    );
  }
  
  return (
    <Center height="100vh">
      <Box p={8} maxWidth="500px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <VStack spacing={6}>
          <Heading as="h1" size="xl" textAlign="center">Create Character</Heading>
          
          <Alert status="info" variant="subtle">
            <AlertIcon />
            <AlertDescription>
              Connected to Monad Testnet: 
              <Text as="span" fontWeight="bold"> Real Game Data</Text>
            </AlertDescription>
          </Alert>
          
          <Divider />
          
          <FormControl>
            <FormLabel>Character Name</FormLabel>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter your character name"
            />
          </FormControl>
          
          <Text fontWeight="bold">
            Attribute Points Remaining: {remainingPoints}
          </Text>
          
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
          
          <Alert status="warning">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <AlertTitle>Wallet Connection Required</AlertTitle>
              <AlertDescription>
                To create a character on the Monad Testnet, you'll need to connect your wallet
                and have MONAD tokens. This is a real blockchain application requiring gas fees.
              </AlertDescription>
            </VStack>
          </Alert>
          
          <Button 
            colorScheme="blue" 
            width="full"
            onClick={handleCreateCharacter}
            isDisabled={remainingPoints !== 0 || !name || isCreating}
          >
            Create Character
          </Button>
        </VStack>
      </Box>
    </Center>
  );
};

export default CharacterCreation; 