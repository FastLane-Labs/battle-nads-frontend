'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TutorialProvider, useTutorial } from './TutorialProvider';
import { TutorialOverlay } from './TutorialOverlay';
import { WelcomeScreen, useWelcomeScreen } from './WelcomeScreen';
import { useWallet } from '@/providers/WalletProvider';

// Onboarding flow configuration
interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  requiredPath?: string; // Path where this flow should auto-trigger
  requiredConditions?: {
    hasWallet?: boolean;
    hasCharacter?: boolean;
    isNewUser?: boolean;
  };
  tutorialFlowId?: string; // Associated tutorial flow ID
  autoTrigger?: boolean;
  priority: number; // Lower number = higher priority
}

const ONBOARDING_FLOWS: OnboardingFlow[] = [
  {
    id: 'welcome',
    name: 'Welcome to Battle Nads',
    description: 'Introduction to the game and blockchain gaming concepts',
    // No requiredPath - can trigger on any page
    requiredConditions: {
      isNewUser: true,
      hasWallet: true,
    },
    autoTrigger: true,
    priority: 1,
  },
  {
    id: 'wallet-connection',
    name: 'Connect Wallet',
    description: 'Learn how to connect your wallet and get MON tokens',
    requiredPath: '/',
    requiredConditions: {
      hasWallet: false,
    },
    tutorialFlowId: 'wallet-setup',
    autoTrigger: true,
    priority: 2,
  },
  {
    id: 'character-creation',
    name: 'Create Character',
    description: 'Learn how to create your first character',
    requiredPath: '/create',
    requiredConditions: {
      hasWallet: true,
      hasCharacter: false,
    },
    tutorialFlowId: 'character-creation',
    autoTrigger: true,
    priority: 3,
  },
  {
    id: 'first-game',
    name: 'First Game Experience',
    description: 'Learn the game interface and basic actions',
    requiredPath: '/game',
    requiredConditions: {
      hasWallet: true,
      hasCharacter: true,
    },
    tutorialFlowId: 'first-game',
    autoTrigger: true,
    priority: 4,
  },
];

interface OnboardingState {
  completedFlows: string[];
  skippedFlows: string[];
  currentFlow: string | null;
  isActive: boolean;
  lastShownFlow: string | null;
}

// Version the storage key to reset onboarding for all users when updated
const ONBOARDING_VERSION = 'v2.0';
const ONBOARDING_STORAGE_KEY = `battlenads_onboarding_state_${ONBOARDING_VERSION}`;

// Development flag - set to true to always show welcome screen on refresh
const DEV_ALWAYS_SHOW_WELCOME = true; // Set to false for production

// Main onboarding manager component
function OnboardingManagerInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentWallet } = useWallet();
  const { hasSeenWelcome, markWelcomeAsSeen } = useWelcomeScreen(currentWallet !== 'none' ? currentWallet : undefined);
  const tutorial = useTutorial();

  const getWalletSpecificStorageKey = () => {
    if (currentWallet === 'none') return ONBOARDING_STORAGE_KEY;
    return `${ONBOARDING_STORAGE_KEY}_${currentWallet}`;
  };

  const [onboardingState, setOnboardingState] = useState<OnboardingState>(() => {
    if (typeof window === 'undefined' || currentWallet === 'none') {
      return {
        completedFlows: [],
        skippedFlows: [],
        currentFlow: null,
        isActive: false,
        lastShownFlow: null,
      };
    }

    const walletSpecificKey = getWalletSpecificStorageKey();
    const stored = localStorage.getItem(walletSpecificKey);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Failed to parse onboarding state:', error);
      }
    }

    return {
      completedFlows: [],
      skippedFlows: [],
      currentFlow: null,
      isActive: false,
      lastShownFlow: null,
    };
  });

  const [showWelcome, setShowWelcome] = useState(false);

  // Save onboarding state to localStorage
  const saveOnboardingState = (state: OnboardingState) => {
    setOnboardingState(state);
    if (currentWallet !== 'none') {
      const walletSpecificKey = getWalletSpecificStorageKey();
      localStorage.setItem(walletSpecificKey, JSON.stringify(state));
    }
  };

  // Check if a flow should be triggered
  const shouldTriggerFlow = (flow: OnboardingFlow): boolean => {
    // Development override - always show welcome flow
    if (DEV_ALWAYS_SHOW_WELCOME && flow.id === 'welcome') {
      return flow.autoTrigger ?? false;
    }

    // Already completed or skipped
    if (onboardingState.completedFlows.includes(flow.id) || 
        onboardingState.skippedFlows.includes(flow.id)) {
      return false;
    }

    // Currently active flow
    if (onboardingState.currentFlow === flow.id) {
      return false;
    }

    // Check path requirement
    if (flow.requiredPath && pathname !== flow.requiredPath) {
      return false;
    }

    // Check conditions
    if (flow.requiredConditions) {
      const { hasWallet: needsWallet, hasCharacter: needsCharacter, isNewUser } = flow.requiredConditions;

      if (needsWallet !== undefined && (currentWallet !== 'none') !== needsWallet) {
        return false;
      }

      // TODO: Add character check when character state is available
      // if (needsCharacter !== undefined && hasCharacter !== needsCharacter) {
      //   return false;
      // }

      if (isNewUser !== undefined) {
        // If flow requires new user, only show if they haven't seen welcome
        if (isNewUser && hasSeenWelcome) {
          return false;
        }
        // If flow requires NOT new user, only show if they have seen welcome  
        if (!isNewUser && !hasSeenWelcome) {
          return false;
        }
      }
    }

    return flow.autoTrigger ?? false;
  };

  // Find the next flow to trigger
  const getNextFlow = (): OnboardingFlow | null => {
    const eligibleFlows = ONBOARDING_FLOWS
      .filter(shouldTriggerFlow)
      .sort((a, b) => a.priority - b.priority);

    return eligibleFlows[0] || null;
  };

  // Handle flow completion
  const completeFlow = (flowId: string) => {
    const newState = {
      ...onboardingState,
      completedFlows: [...onboardingState.completedFlows, flowId],
      currentFlow: null,
      isActive: false,
    };
    saveOnboardingState(newState);
  };

  // Handle flow skip
  const skipFlow = (flowId: string) => {
    const newState = {
      ...onboardingState,
      skippedFlows: [...onboardingState.skippedFlows, flowId],
      currentFlow: null,
      isActive: false,
    };
    saveOnboardingState(newState);
  };

  // Start a specific flow
  const startFlow = (flow: OnboardingFlow) => {
    if (flow.id === 'welcome') {
      setShowWelcome(true);
    } else if (flow.tutorialFlowId) {
      tutorial.startTutorial(flow.tutorialFlowId);
    }

    const newState = {
      ...onboardingState,
      currentFlow: flow.id,
      isActive: true,
      lastShownFlow: flow.id,
    };
    saveOnboardingState(newState);
  };

  // Reset onboarding state when wallet changes
  useEffect(() => {
    if (currentWallet !== 'none') {
      const walletSpecificKey = getWalletSpecificStorageKey();
      const stored = localStorage.getItem(walletSpecificKey);
      if (stored) {
        try {
          setOnboardingState(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to parse onboarding state:', error);
          setOnboardingState({
            completedFlows: [],
            skippedFlows: [],
            currentFlow: null,
            isActive: false,
            lastShownFlow: null,
          });
        }
      } else {
        setOnboardingState({
          completedFlows: [],
          skippedFlows: [],
          currentFlow: null,
          isActive: false,
          lastShownFlow: null,
        });
      }
    }
  }, [currentWallet]);

  // Check for flows to trigger on path/state changes
  useEffect(() => {
    // Don't trigger during tutorial or welcome screen
    if (tutorial.isActive || showWelcome) {
      return;
    }

    const nextFlow = getNextFlow();
    if (nextFlow) {
      // Add a small delay to ensure the page has rendered
      const timer = setTimeout(() => {
        startFlow(nextFlow);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pathname, currentWallet, tutorial.isActive, showWelcome, onboardingState]);

  // Handle welcome screen completion
  const handleWelcomeComplete = () => {
    markWelcomeAsSeen();
    completeFlow('welcome');
    setShowWelcome(false);
  };

  // Handle welcome screen skip
  const handleWelcomeSkip = () => {
    markWelcomeAsSeen();
    skipFlow('welcome');
    setShowWelcome(false);
  };

  // Handle tutorial completion
  useEffect(() => {
    if (!tutorial.isActive && onboardingState.currentFlow) {
      const currentFlow = ONBOARDING_FLOWS.find(f => f.id === onboardingState.currentFlow);
      if (currentFlow && currentFlow.tutorialFlowId) {
        completeFlow(currentFlow.id);
      }
    }
  }, [tutorial.isActive, onboardingState.currentFlow]);

  // Reset onboarding for development/testing
  const resetOnboarding = () => {
    saveOnboardingState({
      completedFlows: [],
      skippedFlows: [],
      currentFlow: null,
      isActive: false,
      lastShownFlow: null,
    });
    tutorial.resetProgress();
    setShowWelcome(false);
  };

  // Expose reset function globally for development
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).resetBattleNadsOnboarding = resetOnboarding;
    }
  }, []);

  return (
    <>
      {/* Welcome Screen */}
      {showWelcome && (
        <WelcomeScreen
          onComplete={handleWelcomeComplete}
          onSkip={handleWelcomeSkip}
        />
      )}

      {/* Tutorial Overlay */}
      <TutorialOverlay />
    </>
  );
}

// Wrapper component that provides tutorial context
export function OnboardingManager() {
  return (
    <TutorialProvider>
      <OnboardingManagerInner />
    </TutorialProvider>
  );
}

// Hook for manual onboarding control
export function useOnboarding() {
  const { hasSeenWelcome, resetWelcomeScreen } = useWelcomeScreen();
  const tutorial = useTutorial();

  const startWelcomeFlow = () => {
    resetWelcomeScreen();
    window.location.reload(); // Trigger welcome screen
  };

  const startTutorialFlow = (flowId: string) => {
    tutorial.startTutorial(flowId);
  };

  const resetAllOnboarding = () => {
    if (typeof window !== 'undefined' && (window as any).resetBattleNadsOnboarding) {
      (window as any).resetBattleNadsOnboarding();
    }
  };

  return {
    hasSeenWelcome,
    tutorial,
    startWelcomeFlow,
    startTutorialFlow,
    resetAllOnboarding,
    availableFlows: ONBOARDING_FLOWS,
  };
}