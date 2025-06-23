'use client';

import React, { useState } from 'react';
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
import { FaGamepad, FaCoins, FaShield, FaUsers, FaArrowRight, FaSkull } from 'react-icons/fa';
import { GameButton } from '../ui/GameButton';

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
    id: 'intro',
    title: 'Welcome to Battle Nads!',
    content: 'A blockchain-based tactical RPG where you create characters, explore dungeons, and battle other players in a persistent world.',
    icon: FaGamepad,
    color: '#F6AD55',
    details: [
      'Turn-based tactical combat system',
      'Persistent character progression',
      'Real-time multiplayer interactions',
      'Blockchain-based ownership of assets',
    ],
  },
  {
    id: 'blockchain',
    title: 'True Ownership',
    content: 'Your characters, equipment, and progress are stored on the Monad blockchain. You truly own your game assets!',
    icon: FaShield,
    color: '#68D391',
    details: [
      'Characters stored permanently on-chain',
      'Trade equipment with other players',
      'No central server can delete your progress',
      'Transparent and verifiable game mechanics',
    ],
  },
  {
    id: 'economy',
    title: 'Real Economy',
    content: 'Battle Nads features a player-driven economy using MON tokens. Earn rewards by defeating enemies, but death means losing your balance!',
    icon: FaCoins,
    color: '#F6E05E',
    details: [
      'Earn MON tokens by defeating players and monsters',
      'Death redistributes your balance to the victor',
      'Session keys enable gasless gameplay',
      'Economic strategy matters as much as combat skill',
    ],
  },
  {
    id: 'community',
    title: 'Competitive Community',
    content: 'Join a thriving community of players. Form alliances, hunt rivals, and compete for dominance in the dungeons.',
    icon: FaUsers,
    color: '#9F7AEA',
    details: [
      'Real-time player vs player combat',
      'Chat system for coordination and taunting',
      'Leaderboards and achievement tracking',
      'Community-driven meta and strategies',
    ],
  },
  {
    id: 'warning',
    title: 'High Stakes Gaming',
    content: 'Battle Nads is not casual gaming. Your decisions have real consequences. Death is permanent and costly. Are you ready?',
    icon: FaSkull,
    color: '#F56565',
    details: [
      'Character death means loss of all balance',
      'No save/reload - all actions are final',
      'Economic losses can be significant',
      'Only play with funds you can afford to lose',
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
      bg="rgba(0, 0, 0, 0.95)"
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
            <Progress
              value={progress}
              colorScheme="orange"
              size="sm"
              borderRadius="full"
              bg="gray.700"
              data-testid="welcome-progress"
            />
            <Text
              fontSize="sm"
              color="gray.400"
              textAlign="center"
              mt={2}
            >
              {currentSlide + 1} of {WELCOME_SLIDES.length}
            </Text>
          </Box>

          {/* Main Content */}
          <Box
            bg="gray.800"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.600"
            p={8}
            maxW="600px"
            w="full"
            transform={isAnimating ? 'scale(0.95)' : 'scale(1)'}
            opacity={isAnimating ? 0.7 : 1}
            transition="all 0.15s ease-in-out"
          >
            <VStack spacing={6} align="center" textAlign="center">
              {/* Icon */}
              <Box
                p={4}
                borderRadius="full"
                bg={slide.color}
                color="gray.900"
              >
                <Icon as={slide.icon} boxSize={8} />
              </Box>

              {/* Title */}
              <Heading size="lg" color="white">
                {slide.title}
              </Heading>

              {/* Content */}
              <Text
                fontSize="lg"
                color="gray.300"
                lineHeight="1.6"
                maxW="500px"
              >
                {slide.content}
              </Text>

              {/* Details */}
              {slide.details && (
                <VStack spacing={2} align="start" w="full" maxW="400px">
                  {slide.details.map((detail, index) => (
                    <HStack key={index} spacing={3} align="start">
                      <Box
                        w={2}
                        h={2}
                        borderRadius="full"
                        bg={slide.color}
                        mt={2}
                        flexShrink={0}
                      />
                      <Text color="gray.400" fontSize="sm">
                        {detail}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              )}
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
                bg={index === currentSlide ? 'orange.400' : 'gray.600'}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  bg: index === currentSlide ? 'orange.300' : 'gray.500',
                }}
                onClick={() => handleSlideSelect(index)}
                data-testid={`slide-indicator-${index}`}
              />
            ))}
          </HStack>

          {/* Navigation */}
          <HStack spacing={4}>
            <Button
              variant="ghost"
              color="gray.400"
              onClick={onSkip}
              size="lg"
              data-testid="skip-welcome"
            >
              Skip Introduction
            </Button>

            <HStack spacing={2}>
              <GameButton
                variant="secondary"
                onClick={handlePrevious}
                disabled={currentSlide === 0 || isAnimating}
                size="lg"
                data-testid="previous-slide"
              >
                Previous
              </GameButton>

              <GameButton
                variant="primary"
                onClick={handleNext}
                disabled={isAnimating}
                size="lg"
                rightIcon={currentSlide === WELCOME_SLIDES.length - 1 ? undefined : <FaArrowRight />}
                data-testid="next-slide"
              >
                {currentSlide === WELCOME_SLIDES.length - 1 ? 'Get Started' : 'Next'}
              </GameButton>
            </HStack>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

// Hook for managing welcome screen state
export function useWelcomeScreen() {
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('battlenads_seen_welcome') === 'true';
  });

  const markWelcomeAsSeen = () => {
    setHasSeenWelcome(true);
    localStorage.setItem('battlenads_seen_welcome', 'true');
  };

  const resetWelcomeScreen = () => {
    setHasSeenWelcome(false);
    localStorage.removeItem('battlenads_seen_welcome');
  };

  return {
    hasSeenWelcome,
    markWelcomeAsSeen,
    resetWelcomeScreen,
  };
}