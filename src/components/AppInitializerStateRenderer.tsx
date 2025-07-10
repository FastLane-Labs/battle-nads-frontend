import React from 'react';
import { AuthState } from '@/types/auth';
import Login from './auth/Login';
import LoadingScreen from './game/screens/LoadingScreen';
import ErrorScreen from './game/screens/ErrorScreen';
import SessionKeyPrompt from './game/screens/SessionKeyPrompt';
import GameContainer from './game/GameContainer';
import DeathModal from './game/modals/DeathModal';
import CharacterCreation from './characters/CharacterCreation';
import { OnboardingManager } from './onboarding';
import AuthenticatedLayout from './layouts/AuthenticatedLayout';
import { shouldShowNavBar } from '@/types/auth';

interface Props {
  authState: AuthState;
  pathname: string;
  renderContent: (state: AuthState) => React.ReactNode;
}

// Declarative mapping of auth states to UI components
export const stateToComponentMap: Record<AuthState, (props: any) => React.ReactNode> = {
  [AuthState.CONTRACT_CHECKING]: () => (
    <LoadingScreen message="Checking contract version..." />
  ),
  
  [AuthState.INITIALIZING]: () => (
    <LoadingScreen message="Initializing Wallet..." />
  ),
  
  [AuthState.NO_WALLET]: () => (
    <>
      <Login />
      <OnboardingManager />
    </>
  ),
  
  [AuthState.LOADING_GAME_DATA]: () => (
    <LoadingScreen message="Initializing Game Data..." />
  ),
  
  [AuthState.ERROR]: ({ error, retry }: { error?: string; retry: () => void }) => (
    <ErrorScreen 
      error={error || 'An unknown error occurred'} 
      retry={retry} 
      onGoToLogin={() => window.location.reload()} 
    />
  ),
  
  [AuthState.NO_CHARACTER]: ({ pathname, onCharacterCreated }: { pathname: string; onCharacterCreated: () => void }) => {
    if (pathname === '/create') {
      return <CharacterCreation onCharacterCreated={onCharacterCreated} />;
    }
    return <LoadingScreen message="Redirecting to character creation..." />;
  },
  
  [AuthState.CHARACTER_DEAD]: ({ pathname, characterName, onCharacterCreated }: { pathname: string; characterName: string; onCharacterCreated: () => void }) => {
    if (pathname === '/create') {
      return <CharacterCreation onCharacterCreated={onCharacterCreated} />;
    }
    return <DeathModal isOpen={true} characterName={characterName} />;
  },
  
  [AuthState.SESSION_KEY_MISSING]: ({ sessionKeyState, onUpdate, isUpdating }: any) => (
    <SessionKeyPrompt
      sessionKeyState={sessionKeyState}
      onUpdate={onUpdate}
      isUpdating={isUpdating}
    />
  ),
  
  [AuthState.SESSION_KEY_INVALID]: ({ sessionKeyState, onUpdate, isUpdating }: any) => (
    <SessionKeyPrompt
      sessionKeyState={sessionKeyState}
      onUpdate={onUpdate}
      isUpdating={isUpdating}
    />
  ),
  
  [AuthState.SESSION_KEY_EXPIRED]: ({ sessionKeyState, onUpdate, isUpdating }: any) => (
    <SessionKeyPrompt
      sessionKeyState={sessionKeyState}
      onUpdate={onUpdate}
      isUpdating={isUpdating}
    />
  ),
  
  [AuthState.SESSION_KEY_UPDATING]: () => (
    <LoadingScreen message="Updating session key..." />
  ),
  
  [AuthState.READY]: ({ gameProps }: { gameProps: any }) => {
    if (!gameProps || !gameProps.character || !gameProps.gameState) {
      return <LoadingScreen message="Loading game data..." />;
    }
    return <GameContainer {...gameProps} />;
  },
};

// Helper component to render with navigation bar when needed
export const AppInitializerStateRenderer: React.FC<Props> = ({ authState, pathname, renderContent }) => {
  const content = renderContent(authState);
  
  // Special case: NO_WALLET state doesn't show nav bar or use AuthenticatedLayout
  if (authState === AuthState.NO_WALLET) {
    return <>{content}</>;
  }
  
  // All other states use AuthenticatedLayout
  return (
    <AuthenticatedLayout showNavBar={shouldShowNavBar(authState)}>
      {content}
    </AuthenticatedLayout>
  );
};