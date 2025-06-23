'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Tutorial step configuration
export interface TutorialStep {
  id: string;
  target: string; // CSS selector for the element to highlight
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  disableBeacon?: boolean;
  spotlightClicks?: boolean;
  hideCloseButton?: boolean;
  hideBackButton?: boolean;
  showProgress?: boolean;
  styles?: {
    options?: {
      primaryColor?: string;
      backgroundColor?: string;
      overlayColor?: string;
      spotlightShadow?: string;
      textColor?: string;
      width?: number;
      zIndex?: number;
    };
  };
}

export interface TutorialFlow {
  id: string;
  name: string;
  description: string;
  steps: TutorialStep[];
  autoStart?: boolean;
  showProgress?: boolean;
  showSkipButton?: boolean;
}

interface TutorialContextType {
  // Current tutorial state
  isActive: boolean;
  currentFlow: TutorialFlow | null;
  currentStepIndex: number;
  
  // Tutorial flows
  availableFlows: TutorialFlow[];
  completedFlows: string[];
  
  // Control methods
  startTutorial: (flowId: string) => void;
  stopTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  
  // Flow management
  registerFlow: (flow: TutorialFlow) => void;
  isFlowCompleted: (flowId: string) => boolean;
  resetProgress: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// Tutorial flow definitions
export const TUTORIAL_FLOWS: TutorialFlow[] = [
  {
    id: 'welcome',
    name: 'Welcome to Battle Nads',
    description: 'Learn the basics of the game',
    autoStart: true,
    showProgress: true,
    showSkipButton: true,
    steps: [
      {
        id: 'welcome-1',
        target: 'body',
        title: '🎮 Welcome to Battle Nads!',
        content: 'Battle Nads is a blockchain-based tactical RPG where you create characters, explore dungeons, and battle other players. Let\'s get you started!',
        placement: 'center',
        disableBeacon: true,
        showProgress: true,
      },
      {
        id: 'welcome-2',
        target: 'body',
        title: '⛓️ Blockchain Gaming',
        content: 'This game runs on the Monad blockchain. Your character, equipment, and progress are stored permanently on-chain. You truly own your game assets!',
        placement: 'center',
        disableBeacon: true,
      },
      {
        id: 'welcome-3',
        target: 'body',
        title: '💰 Economic Gameplay',
        content: 'Battle Nads has a real economy using MON tokens. You can earn rewards by defeating other players and monsters, but death means losing your balance!',
        placement: 'center',
        disableBeacon: true,
      },
    ],
  },
  {
    id: 'wallet-setup',
    name: 'Wallet Connection',
    description: 'Connect your wallet and get MON tokens',
    showProgress: true,
    showSkipButton: true,
    steps: [
      {
        id: 'wallet-1',
        target: '[data-testid="connect-wallet-button"]',
        title: '🔗 Connect Your Wallet',
        content: 'First, you need to connect a Web3 wallet like MetaMask. Click the "Connect Wallet" button to get started.',
        placement: 'bottom',
      },
      {
        id: 'wallet-2',
        target: '[data-testid="wallet-balance"]',
        title: '💎 MON Tokens Required',
        content: 'You need approximately 0.15 MON tokens to create a character: 0.1 for buy-in + 0.05 minimum bonded balance.',
        placement: 'bottom',
      },
      {
        id: 'wallet-3',
        target: '[data-testid="session-key-prompt"]',
        title: '🔑 Session Keys (Optional)',
        content: 'Session keys allow gasless gameplay. They\'re optional but highly recommended for a better experience.',
        placement: 'top',
      },
    ],
  },
  {
    id: 'character-creation',
    name: 'Character Creation',
    description: 'Create your first character',
    showProgress: true,
    showSkipButton: true,
    steps: [
      {
        id: 'char-1',
        target: '[data-testid="character-name-input"]',
        title: '📝 Character Name',
        content: 'Choose a unique name for your character. This will be visible to other players in the game.',
        placement: 'bottom',
      },
      {
        id: 'char-2',
        target: '[data-testid="stat-allocation"]',
        title: '📊 Stat Allocation',
        content: 'You have 32 points to distribute across 6 attributes. These determine your character\'s combat effectiveness.',
        placement: 'left',
      },
      {
        id: 'char-3',
        target: '[data-testid="strength-stat"]',
        title: '💪 Strength',
        content: 'Strength determines your weapon damage. Higher strength = more damage dealt to enemies.',
        placement: 'right',
      },
      {
        id: 'char-4',
        target: '[data-testid="vitality-stat"]',
        title: '❤️ Vitality',
        content: 'Vitality affects your health pool and regeneration rate. Essential for survivability.',
        placement: 'right',
      },
      {
        id: 'char-5',
        target: '[data-testid="class-selection"]',
        title: '⚔️ Character Class',
        content: 'Your class provides stat bonuses and special abilities. Warrior is recommended for beginners.',
        placement: 'top',
      },
    ],
  },
  {
    id: 'first-game',
    name: 'First Game Experience',
    description: 'Learn the game interface and basic actions',
    showProgress: true,
    showSkipButton: true,
    steps: [
      {
        id: 'game-1',
        target: '[data-testid="character-info"]',
        title: '👤 Character Info',
        content: 'This panel shows your character\'s current stats, health, and equipment. Monitor this during gameplay.',
        placement: 'right',
      },
      {
        id: 'game-2',
        target: '[data-testid="movement-controls"]',
        title: '🎮 Movement Controls',
        content: 'Use these buttons to move around the dungeon. You can move North, South, East, West, Up (deeper), or Down (surface).',
        placement: 'top',
      },
      {
        id: 'game-3',
        target: '[data-testid="health-bar"]',
        title: '❤️ Health Bar',
        content: 'Keep an eye on your health! When it reaches zero, your character dies and you lose your balance.',
        placement: 'bottom',
      },
      {
        id: 'game-4',
        target: '[data-testid="ability-controls"]',
        title: '⚡ Abilities',
        content: 'Your class abilities are powerful tools. Each has a cooldown period after use.',
        placement: 'top',
      },
      {
        id: 'game-5',
        target: '[data-testid="combat-targets"]',
        title: '🎯 Combat',
        content: 'When enemies are nearby, you can attack them. Combat is turn-based and automatic once started.',
        placement: 'left',
      },
      {
        id: 'game-6',
        target: '[data-testid="event-feed"]',
        title: '📜 Event Feed',
        content: 'This shows what\'s happening around you - combat results, other players\' actions, and important events.',
        placement: 'left',
      },
    ],
  },
];

const STORAGE_KEY = 'battlenads_tutorial_progress';

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<TutorialFlow | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [availableFlows, setAvailableFlows] = useState<TutorialFlow[]>(TUTORIAL_FLOWS);
  const [completedFlows, setCompletedFlows] = useState<string[]>([]);

  // Load completed flows from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setCompletedFlows(data.completedFlows || []);
      } catch (error) {
        console.error('Failed to load tutorial progress:', error);
      }
    }
  }, []);

  // Save progress to localStorage
  const saveProgress = (completed: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      completedFlows: completed,
      lastUpdated: new Date().toISOString(),
    }));
  };

  const startTutorial = (flowId: string) => {
    const flow = availableFlows.find(f => f.id === flowId);
    if (flow) {
      setCurrentFlow(flow);
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  };

  const stopTutorial = () => {
    setIsActive(false);
    setCurrentFlow(null);
    setCurrentStepIndex(0);
  };

  const nextStep = () => {
    if (currentFlow && currentStepIndex < currentFlow.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      completeTutorial();
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const skipTutorial = () => {
    if (currentFlow) {
      const newCompleted = [...completedFlows, currentFlow.id];
      setCompletedFlows(newCompleted);
      saveProgress(newCompleted);
    }
    stopTutorial();
  };

  const completeTutorial = () => {
    if (currentFlow) {
      const newCompleted = [...completedFlows, currentFlow.id];
      setCompletedFlows(newCompleted);
      saveProgress(newCompleted);
    }
    stopTutorial();
  };

  const registerFlow = (flow: TutorialFlow) => {
    setAvailableFlows(prev => {
      const existing = prev.find(f => f.id === flow.id);
      if (existing) {
        return prev.map(f => f.id === flow.id ? flow : f);
      }
      return [...prev, flow];
    });
  };

  const isFlowCompleted = (flowId: string) => {
    return completedFlows.includes(flowId);
  };

  const resetProgress = () => {
    setCompletedFlows([]);
    localStorage.removeItem(STORAGE_KEY);
    stopTutorial();
  };

  const value: TutorialContextType = {
    isActive,
    currentFlow,
    currentStepIndex,
    availableFlows,
    completedFlows,
    startTutorial,
    stopTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    registerFlow,
    isFlowCompleted,
    resetProgress,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}