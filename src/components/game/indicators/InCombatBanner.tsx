import React from 'react';
import {
  Box,
  Text,
  Fade,
  Icon
} from '@chakra-ui/react';
// Assuming you might want an icon, add one like below or remove if not needed
// import { FaShieldAlt } from 'react-icons/fa'; // Example icon

interface InCombatBannerProps {
  isVisible: boolean;
}

const InCombatBanner: React.FC<InCombatBannerProps> = ({ isVisible }) => (
  <Fade in={isVisible} unmountOnExit>
    <Box
      position="fixed" 
      top="70px" // Adjust as needed, below NavBar
      left="50%"
      transform="translateX(-50%)"
      bg="red.600" 
      color="white"
      px={4}
      py={1}
      borderRadius="md"
      zIndex={1100} // Ensure it's above most other UI elements
      boxShadow="lg"
      textAlign="center"
    >
      {/* <Icon as={FaShieldAlt} mr={2} /> */}
      <Text fontWeight="bold" fontSize="sm">⚔️ IN COMBAT</Text>
    </Box>
  </Fade>
);

export default InCombatBanner; 