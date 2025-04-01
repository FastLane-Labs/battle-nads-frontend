import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Heading, 
  Center, 
  VStack, 
  Text, 
  Spinner, 
  Grid, 
  GridItem,
  Badge,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button
} from '@chakra-ui/react';
import { usePrivy } from '@privy-io/react-auth';
import { useBattleNads } from '../hooks/useBattleNads';

const GameDemo: React.FC = () => {
  const { user } = usePrivy();
  const { getPlayerCharacterID, getCharacter, loading, error } = useBattleNads();
  const [character, setCharacter] = useState<any>(null);

  useEffect(() => {
    const fetchCharacter = async () => {
      if (user?.wallet?.address) {
        try {
          const characterId = await getPlayerCharacterID(user.wallet.address);
          
          if (characterId) {
            const characterData = await getCharacter(characterId);
            if (characterData) {
              setCharacter(characterData);
            }
          }
        } catch (err) {
          console.error("Error fetching character:", err);
        }
      }
    };

    fetchCharacter();
  }, [user, getPlayerCharacterID, getCharacter]);

  if (loading) {
    return (
      <Center height="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading character data from the Monad Testnet...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center height="100vh">
        <VStack spacing={4} maxWidth="600px" p={4}>
          <Heading color="red.500">Error</Heading>
          <Alert status="error">
            <AlertIcon />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Text>
            There was an error connecting to the Battle Nads contract on Monad Testnet.
            Please check your network connection and try again.
          </Text>
        </VStack>
      </Center>
    );
  }

  if (!character) {
    return (
      <Center height="100vh">
        <VStack spacing={4}>
          <Heading>No Character Found</Heading>
          <Text>You should be redirected to character creation.</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Center height="100vh">
      <Box p={8} maxWidth="600px" borderWidth={1} borderRadius="lg" boxShadow="lg">
        <VStack spacing={6} align="stretch">
          <Heading as="h1" size="xl" textAlign="center">Battle Nads</Heading>
          
          <Alert status="info" variant="subtle">
            <AlertIcon />
            <AlertDescription>
              Connected to Monad Testnet: 
              <Text as="span" fontWeight="bold"> Real Game Data</Text>
            </AlertDescription>
          </Alert>
          
          <Divider />
          
          <Heading as="h2" size="lg">
            {character.name} <Badge colorScheme="green">Level {character.stats.level}</Badge>
          </Heading>
          
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <GridItem>
              <Text fontWeight="bold">Health:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.stats.health}</Text>
            </GridItem>
            
            <GridItem>
              <Text fontWeight="bold">Experience:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.stats.experience}</Text>
            </GridItem>
            
            <GridItem>
              <Text fontWeight="bold">Location:</Text>
            </GridItem>
            <GridItem>
              <Text>Depth: {character.stats.depth}, X: {character.stats.x}, Y: {character.stats.y}</Text>
            </GridItem>
          </Grid>
          
          <Divider />
          
          <Heading as="h3" size="md">Attributes</Heading>
          
          <Grid templateColumns="repeat(2, 1fr)" gap={2}>
            <GridItem>
              <Text fontWeight="bold">Strength:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.stats.strength}</Text>
            </GridItem>
            
            <GridItem>
              <Text fontWeight="bold">Vitality:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.stats.vitality}</Text>
            </GridItem>
            
            <GridItem>
              <Text fontWeight="bold">Dexterity:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.stats.dexterity}</Text>
            </GridItem>
            
            <GridItem>
              <Text fontWeight="bold">Quickness:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.stats.quickness}</Text>
            </GridItem>
            
            <GridItem>
              <Text fontWeight="bold">Sturdiness:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.stats.sturdiness}</Text>
            </GridItem>
            
            <GridItem>
              <Text fontWeight="bold">Luck:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.stats.luck}</Text>
            </GridItem>
          </Grid>
          
          <Divider />
          
          <Heading as="h3" size="md">Equipment</Heading>
          
          <Grid templateColumns="repeat(2, 1fr)" gap={2}>
            <GridItem>
              <Text fontWeight="bold">Weapon:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.weapon.name}</Text>
            </GridItem>
            
            <GridItem>
              <Text fontWeight="bold">Armor:</Text>
            </GridItem>
            <GridItem>
              <Text>{character.armor.name}</Text>
            </GridItem>
          </Grid>
          
          <Divider />
          
          <Alert status="warning">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <AlertTitle>Wallet Connection Required for Game Actions</AlertTitle>
              <AlertDescription>
                To move, attack, or interact with the game world, you need to connect
                your wallet with the Monad Testnet. This is a real blockchain application,
                not a demo.
              </AlertDescription>
            </VStack>
          </Alert>
          
          <Button 
            colorScheme="blue" 
            isDisabled={true}
          >
            Connect Wallet to Play (Coming Soon)
          </Button>
        </VStack>
      </Box>
    </Center>
  );
};

export default GameDemo; 