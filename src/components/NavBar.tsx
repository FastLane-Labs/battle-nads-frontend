import React from 'react';
import {
  Box,
  Flex,
  HStack,
  Button,
  useColorModeValue,
  Text,
  Image,
  Link,
  useDisclosure,
  IconButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  VStack,
  Spacer
} from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import WalletConnector from './WalletConnector';

const NavBar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const location = useLocation();
  const bg = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Define navigation links
  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Create Character', path: '/create' },
    { name: 'Game', path: '/game' }
  ];

  // Check if the navigation item is the current page
  const isActive = (path: string) => location.pathname === path;

  return (
    <Box 
      px={4} 
      py={2} 
      position="fixed" 
      width="100%" 
      bg={bg} 
      borderBottom="1px" 
      borderColor={borderColor}
      zIndex={10}
    >
      <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
        <IconButton
          size={'md'}
          icon={<HamburgerIcon />}
          aria-label={'Open Menu'}
          display={{ md: 'none' }}
          onClick={onOpen}
        />
        
        <HStack spacing={8} alignItems={'center'}>
          <Box>
            <RouterLink to="/">
              <Image 
                src="/BattleNadsLogo.png" 
                alt="Battle Nads" 
                height="40px"
              />
            </RouterLink>
          </Box>
          <HStack
            as={'nav'}
            spacing={4}
            display={{ base: 'none', md: 'flex' }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.path}
                as={RouterLink}
                to={link.path}
                px={2}
                py={1}
                rounded={'md'}
                fontWeight={isActive(link.path) ? 'bold' : 'normal'}
                color={isActive(link.path) ? 'blue.500' : 'inherit'}
                _hover={{
                  textDecoration: 'none',
                  bg: useColorModeValue('gray.200', 'gray.700'),
                }}
              >
                {link.name}
              </Link>
            ))}
          </HStack>
        </HStack>
        
        <Spacer />
        
        <WalletConnector variant="compact" />
      </Flex>

      {/* Mobile navigation drawer */}
      <Drawer
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Navigation</DrawerHeader>

          <DrawerBody>
            <VStack spacing={4} align="stretch">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  as={RouterLink}
                  to={link.path}
                  px={2}
                  py={1}
                  rounded={'md'}
                  fontWeight={isActive(link.path) ? 'bold' : 'normal'}
                  color={isActive(link.path) ? 'blue.500' : 'inherit'}
                  _hover={{
                    textDecoration: 'none',
                    bg: useColorModeValue('gray.200', 'gray.700'),
                  }}
                  onClick={onClose}
                >
                  {link.name}
                </Link>
              ))}
              
              <Box pt={4}>
                <WalletConnector />
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default NavBar; 