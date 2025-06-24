'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Image,
  Progress,
  Icon,
  Flex,
  Container,
  Heading,
} from '@chakra-ui/react';
import { FaGamepad, FaCoins, FaUsers, FaArrowRight, FaSkull } from 'react-icons/fa';
import { FaShield } from 'react-icons/fa6';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { GameButton } from '@/components/ui/GameButton';

interface WelcomeScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface WelcomeSlide {
  id: string;
  title: string;
  content: string;
  icon: React.ComponentType;
  color: string;
  details?: string[];
}

const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    id: 'welcome',
    title: 'Welcome to Battle Nads!',
    content: 'Enter the eternal realm where heroes are forged on the Monad blockchain.',
    icon: FaShield,
    color: '#d4af37',
    details: [
      'Heroes live forever on-chain',
      'Turn-based tactical combat awaits',
      'True ownership of your digital destiny',
    ],
  },
  {
    id: 'character',
    title: 'Forge Your Hero',
    content: 'Choose a name and allocate your skill points. The chain will remember your choices for all time.',
    icon: FaGamepad,
    color: '#d4af37',
    details: [
      'Allocate stats to match your strategy',
      'Choose a name that echoes through eternity',
      'Your hero lives forever on-chain',
    ],
  },
  {
    id: 'movement',
    title: 'Master the Board',
    content: 'Move with the arrows to explore each depth of the ancient dungeons.',
    icon: FaArrowRight,
    color: '#d4af37',
    details: [
      'Navigate turn-based tactical combat',
      'Explore multiple dungeon depths',
      'Position matters in every battle',
    ],
  },
  {
    id: 'abilities',
    title: 'Strike & Guard',
    content: 'Abilities cost balance — watch cooldowns and unleash devastating combos to defeat your foes.',
    icon: FaCoins,
    color: '#d4af37',
    details: [
      'Master unique class abilities',
      'Manage resources and cooldowns',
      'Timing determines victory',
    ],
  },
  {
    id: 'ownership',
    title: 'True Ownership',
    content: 'Loot and XP live on the Monad blockchain. Equip your treasures—they are truly yours forever.',
    icon: FaSkull,
    color: '#d4af37',
    details: [
      'All loot stored permanently on-chain',
      'Equip and upgrade your gear',
      'True ownership of digital assets',
    ],
  },
];

export function WelcomeScreen({ onComplete, onSkip }: WelcomeScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating) return;

    if (currentSlide < WELCOME_SLIDES.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide(currentSlide + 1);
        setIsAnimating(false);
      }, 150);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (isAnimating || currentSlide === 0) return;

    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide(currentSlide - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleSlideSelect = (index: number) => {
    if (isAnimating || index === currentSlide) return;

    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsAnimating(false);
    }, 150);
  };

  const slide = WELCOME_SLIDES[currentSlide];
  const progress = ((currentSlide + 1) / WELCOME_SLIDES.length) * 100;

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="rgba(5, 22, 43, 0.25)"
      backdropFilter="blur(7px)"
      zIndex="9999"
      display="flex"
      alignItems="center"
      justifyContent="center"
      data-testid="welcome-screen"
    >
      <Container maxW="4xl" py={8}>
        <VStack spacing={8} align="center">
          {/* Progress Bar */}
          <Box w="full" maxW="400px">
            <Box w="full" h="4px" bg="#10243b" borderRadius="full" overflow="hidden" position="relative">
              <Box
                position="absolute"
                inset={0}
                w={`${progress}%`}
                bg="#d4af37"
                transition="all 0.3s ease"
              />
            </Box>
            <Text
              fontSize="sm"
              color="#f0e6c0"
              textAlign="center"
              mt={2}
            >
              {currentSlide + 1} of {WELCOME_SLIDES.length}
            </Text>
          </Box>

          {/* Main Content */}
          <Box
            backgroundImage="/assets/bg/tutorial-bg.webp"
            backgroundSize="100% 100%"
            backgroundRepeat="no-repeat"
            backgroundPosition="center"
            px={8}
            py={16}
            maxW="650px"
            w="full"
            transform={isAnimating ? 'scale(0.95)' : 'scale(1)'}
            opacity={isAnimating ? 0.7 : 1}
            transition="all 0.15s ease-in-out"
          >
            <VStack spacing={5} align="center" textAlign="center">
              {/* Icon */}
              <Box
                p={4}
                borderRadius="full"
                bg="#d4af37"
                color="#05162b"
                boxShadow="0 0 12px rgba(212,175,55,0.6)"
              >
                <Icon as={slide.icon} boxSize={8} />
              </Box>

              {/* Title */}
              <h2 className='gold-text-light text-2xl md:text-4xl md:text-nowrap font-bold'>
                {slide.title}
              </h2>

              <div className='flex flex-col gap-4 py-4 px-6 md:border md:border-amber-600/20 rounded-xl items-center md:bg-brown/40'>
              {/* Content */}
              <Text
                color="#f0e6c0"
                lineHeight="1.6"
                maxW="450px"
                className='md:text-lg'
                >
                {slide.content}
              </Text>

              {/* Details */}
              {slide.details && (
                <VStack spacing={1} align="start" w="full" maxW="400px">
                  {slide.details.map((detail, index) => (
                    <HStack key={index} spacing={3} align="center">
                      <Text
                        color="#d4af37"
                        fontSize="md"
                        mt={0.5}
                        flexShrink={0}
                        >
                        ◆
                      </Text>
                      <Text color="#f0e6c0" fontSize="sm" className='text-nowrap'>
                        {detail}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              )}
              </div>
            </VStack>
          </Box>

          {/* Slide Indicators */}
          <HStack spacing={2}>
            {WELCOME_SLIDES.map((_, index) => (
              <Box
                key={index}
                w={3}
                h={3}
                borderRadius="full"
                bg={index === currentSlide ? '#d4af37' : '#10243b'}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  bg: index === currentSlide ? '#f0e6c0' : '#05162b',
                }}
                onClick={() => handleSlideSelect(index)}
                data-testid={`slide-indicator-${index}`}
              />
            ))}
          </HStack>

          {/* Navigation */}
          <HStack spacing={2}>
            <Button
              variant="ghost"
              color="#f0e6c0"
              onClick={onSkip}
              size="md"
              data-testid="skip-welcome"
              _hover={{ color: '#d4af37' }}
              textTransform="uppercase"
              letterSpacing="0.5px"
              fontWeight="bold"
              opacity={0.7}
            >
              SKIP
            </Button>

            <HStack spacing={2}>
              <Box
                as="button"
                onClick={handlePrevious}
                disabled={currentSlide === 0 || isAnimating}
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="#d4af37"
                _active={{ transform: 'translateY(1px)' }}
                transition="all 0.2s"
                opacity={currentSlide === 0 || isAnimating ? 0.3 : 1}
                cursor={currentSlide === 0 || isAnimating ? 'not-allowed' : 'pointer'}
                data-testid="previous-slide"
                 className='px-2 h-[60px]'
              >
                <Icon as={FaChevronLeft} boxSize={4} />
              </Box>

              <Box w="200px">
                <GameButton
                  variant="primary"
                  onClick={handleNext}
                  isDisabled={isAnimating}
                  data-testid="next-slide"
                  hasGlow={currentSlide === WELCOME_SLIDES.length - 1 ? true : false}

                >
                  <HStack spacing={2} align="center">
                    <Text>
                      {currentSlide === WELCOME_SLIDES.length - 1 ? 'GET STARTED' : 'NEXT'}
                    </Text>
                    {currentSlide !== WELCOME_SLIDES.length - 1 && (
                      <Icon as={FaChevronRight} boxSize={4} color="#d4af37" />
                    )}
                  </HStack>
                </GameButton>
              </Box>
            </HStack>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

// Version for the onboarding feature - increment this to show to all users again
const ONBOARDING_VERSION = 'v2.0';
const WELCOME_SEEN_KEY = `battlenads_seen_welcome_${ONBOARDING_VERSION}`;

// Hook for managing welcome screen state
export function useWelcomeScreen(walletAddress?: string) {
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !walletAddress) return false;
    
    // Create wallet-specific key
    const walletSpecificKey = `${WELCOME_SEEN_KEY}_${walletAddress}`;
    return localStorage.getItem(walletSpecificKey) === 'true';
  });

  // Listen for changes to the localStorage key
  useEffect(() => {
    if (!walletAddress) return;
    
    const walletSpecificKey = `${WELCOME_SEEN_KEY}_${walletAddress}`;
    
    const checkWelcomeStatus = () => {
      const currentStatus = localStorage.getItem(walletSpecificKey) === 'true';
      setHasSeenWelcome(currentStatus);
    };
    
    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', checkWelcomeStatus);
    
    // Also check periodically for same-tab updates
    const interval = setInterval(checkWelcomeStatus, 500);
    
    return () => {
      window.removeEventListener('storage', checkWelcomeStatus);
      clearInterval(interval);
    };
  }, [walletAddress]);

  const markWelcomeAsSeen = () => {
    if (!walletAddress) return;
    
    setHasSeenWelcome(true);
    const walletSpecificKey = `${WELCOME_SEEN_KEY}_${walletAddress}`;
    localStorage.setItem(walletSpecificKey, 'true');
  };

  const resetWelcomeScreen = () => {
    if (!walletAddress) return;
    
    setHasSeenWelcome(false);
    const walletSpecificKey = `${WELCOME_SEEN_KEY}_${walletAddress}`;
    localStorage.removeItem(walletSpecificKey);
  };

  return {
    hasSeenWelcome,
    markWelcomeAsSeen,
    resetWelcomeScreen,
  };
}