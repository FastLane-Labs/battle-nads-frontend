import { createActor } from 'xstate';
import { appInitializerMachine, stateToAuthState } from '../appInitializerMachine';
import { AuthState } from '@/types/auth';
import { SessionKeyState } from '@/types/domain/session';

describe('appInitializerMachine', () => {
  it('should start in contractChecking state', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    expect(actor.getSnapshot().value).toBe('contractChecking');
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.CONTRACT_CHECKING);
  });

  it('should transition from contractChecking to initializing', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    
    expect(actor.getSnapshot().value).toBe('initializing');
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.INITIALIZING);
  });

  it('should transition to noWallet when wallet not connected', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED' });
    
    expect(actor.getSnapshot().value).toBe('noWallet');
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.NO_WALLET);
  });

  it('should transition to loadingGameData when wallet is connected', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_CONNECTED', walletAddress: '0x123' });
    
    expect(actor.getSnapshot().value).toBe('loadingGameData');
    expect(actor.getSnapshot().context.walletAddress).toBe('0x123');
  });

  it('should transition to noCharacter when character ID is zero and welcome seen', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_CONNECTED', walletAddress: '0x123' });
    actor.send({ type: 'ONBOARDING_COMPLETE' });
    actor.send({ 
      type: 'GAME_DATA_LOADED', 
      characterId: '0x0000000000000000000000000000000000000000000000000000000000000000' 
    });
    
    expect(actor.getSnapshot().value).toBe('noCharacter');
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.NO_CHARACTER);
  });

  it('should handle character creation and move to checking status', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_CONNECTED', walletAddress: '0x123' });
    actor.send({ type: 'ONBOARDING_COMPLETE' });
    actor.send({ 
      type: 'GAME_DATA_LOADED', 
      characterId: '0x0000000000000000000000000000000000000000000000000000000000000000' 
    });
    actor.send({ type: 'CHARACTER_CREATED', characterId: '0xabc123' });
    
    // Should go through checkingCharacterStatus and immediately to checkingSessionKey
    expect(actor.getSnapshot().value).toBe('checkingSessionKey');
    expect(actor.getSnapshot().context.characterId).toBe('0xabc123');
  });

  it('should handle session key states correctly', () => {
    const actor = createActor(appInitializerMachine, {
      input: {
        walletAddress: '0x123',
        hasSeenWelcome: true,
        sessionKeyState: SessionKeyState.MISSING,
      }
    });
    actor.start();
    
    // Skip to session key checking
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED' });
    actor.send({ type: 'GAME_DATA_LOADED', characterId: '0xabc123' });
    
    // Since context has sessionKeyState as MISSING, it should go to sessionKeyMissing
    expect(actor.getSnapshot().value).toBe('sessionKeyMissing');
  });

  it('should transition to ready state when session key is valid', () => {
    const actor = createActor(appInitializerMachine, {
      input: {
        walletAddress: '0x123',
        hasSeenWelcome: true,
        sessionKeyState: SessionKeyState.VALID,
      }
    });
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED' });
    actor.send({ type: 'GAME_DATA_LOADED', characterId: '0xabc123' });
    
    expect(actor.getSnapshot().value).toBe('ready');
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.READY);
  });

  it('should handle wallet disconnection from any state', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_CONNECTED', walletAddress: '0x123' });
    actor.send({ type: 'WALLET_DISCONNECTED' });
    
    expect(actor.getSnapshot().value).toBe('noWallet');
    expect(actor.getSnapshot().context.walletAddress).toBeNull();
    expect(actor.getSnapshot().context.characterId).toBeNull();
  });

  it('should handle errors correctly', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    const error = new Error('Test error');
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_CONNECTED', walletAddress: '0x123' });
    actor.send({ type: 'GAME_DATA_ERROR', error });
    
    expect(actor.getSnapshot().value).toBe('error');
    expect(actor.getSnapshot().context.error).toBe(error);
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.ERROR);
  });

  it('should retry from error state', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    const error = new Error('Test error');
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_CONNECTED', walletAddress: '0x123' });
    actor.send({ type: 'GAME_DATA_ERROR', error });
    actor.send({ type: 'RETRY' });
    
    expect(actor.getSnapshot().value).toBe('loadingGameData');
  });
});