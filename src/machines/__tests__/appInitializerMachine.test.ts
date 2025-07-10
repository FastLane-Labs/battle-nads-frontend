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

  it('should transition to initializing after contract check', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    
    expect(actor.getSnapshot().value).toBe('initializing');
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.INITIALIZING);
  });

  it('should have initial context values', () => {
    const actor = createActor(appInitializerMachine, {
      input: {
        walletAddress: '0x123',
        hasSeenWelcome: true,
      }
    });
    actor.start();
    
    const snapshot = actor.getSnapshot();
    expect(snapshot.context.walletAddress).toBe('0x123');
    expect(snapshot.context.hasSeenWelcome).toBe(true);
    expect(snapshot.context.error).toBeNull();
    expect(snapshot.context.characterId).toBeNull();
  });

  it('should transition to loadingGameData when wallet is initialized with embedded wallet', () => {
    const actor = createActor(appInitializerMachine, {
      input: { walletAddress: '0x123' }
    });
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
    
    expect(actor.getSnapshot().value).toBe('loadingGameData');
    expect(actor.getSnapshot().context.walletAddress).toBe('0x123');
    expect(actor.getSnapshot().context.hasEmbeddedWallet).toBe(true);
  });
  
  it('should transition to noWallet when wallet is initialized without embedded wallet', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: false });
    
    expect(actor.getSnapshot().value).toBe('noWallet');
  });
  
  it('should transition from noWallet to loadingGameData when wallet connects', () => {
    const actor = createActor(appInitializerMachine);
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: false });
    expect(actor.getSnapshot().value).toBe('noWallet');
    
    actor.send({ type: 'WALLET_CONNECTED', walletAddress: '0x123' });
    expect(actor.getSnapshot().value).toBe('loadingGameData');
    expect(actor.getSnapshot().context.walletAddress).toBe('0x123');
  });

  it('should transition to noCharacter when character ID is zero and welcome seen', () => {
    const actor = createActor(appInitializerMachine, {
      input: { walletAddress: '0x123', hasSeenWelcome: true }
    });
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
    actor.send({ 
      type: 'GAME_DATA_LOADED', 
      characterId: '0x0000000000000000000000000000000000000000000000000000000000000000' 
    });
    
    expect(actor.getSnapshot().value).toBe('noCharacter');
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.NO_CHARACTER);
  });

  it('should handle character creation and move to checking status', () => {
    const actor = createActor(appInitializerMachine, {
      input: { walletAddress: '0x123', hasSeenWelcome: true }
    });
    actor.start();
    
    // Go to noCharacter state
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
    actor.send({ 
      type: 'GAME_DATA_LOADED', 
      characterId: '0x0000000000000000000000000000000000000000000000000000000000000000' 
    });
    
    // Create character
    actor.send({ type: 'CHARACTER_CREATED', characterId: '0xabc123' });
    
    // Should go through checkingCharacterStatus to sessionKeyMissing (no session key state provided)
    expect(actor.getSnapshot().value).toBe('sessionKeyMissing');
    expect(actor.getSnapshot().context.characterId).toBe('0xabc123');
  });

  describe('session key states', () => {
    it('should handle session key states correctly', () => {
      const actor = createActor(appInitializerMachine, {
        input: { 
          walletAddress: '0x123',
          sessionKeyState: SessionKeyState.MISSING
        }
      });
      actor.start();
      
      // Navigate to game data loaded
      actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
      actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
      actor.send({ 
        type: 'GAME_DATA_LOADED', 
        characterId: '0xabc123',
        sessionKeyState: SessionKeyState.MISSING
      });
      
      // Since context has sessionKeyState as MISSING, it should go to sessionKeyMissing
      expect(actor.getSnapshot().value).toBe('sessionKeyMissing');
    });

    it('should transition to ready state when session key is valid', () => {
      const actor = createActor(appInitializerMachine, {
        input: { 
          walletAddress: '0x123',
          sessionKeyState: SessionKeyState.VALID
        }
      });
      actor.start();
      
      actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
      actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
      actor.send({ type: 'GAME_DATA_LOADED', characterId: '0xabc123', sessionKeyState: SessionKeyState.VALID });
      
      expect(actor.getSnapshot().value).toBe('ready');
      expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.READY);
    });
    
    it('should handle SESSION_KEY_VALID event in session key prompt states', () => {
      const actor = createActor(appInitializerMachine, {
        input: { 
          walletAddress: '0x123',
          sessionKeyState: SessionKeyState.MISSING
        }
      });
      actor.start();
      
      // Navigate to sessionKeyMissing
      actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
      actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
      actor.send({ 
        type: 'GAME_DATA_LOADED', 
        characterId: '0xabc123',
        sessionKeyState: SessionKeyState.MISSING
      });
      
      expect(actor.getSnapshot().value).toBe('sessionKeyMissing');
      
      // Send SESSION_KEY_VALID event
      actor.send({ type: 'SESSION_KEY_VALID' });
      
      expect(actor.getSnapshot().value).toBe('ready');
      expect(actor.getSnapshot().context.sessionKeyState).toBe(SessionKeyState.VALID);
    });
    
    it('should transition through session key updating state', () => {
      const actor = createActor(appInitializerMachine, {
        input: { walletAddress: '0x123' }
      });
      actor.start();
      
      // Navigate to sessionKeyMissing
      actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
      actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
      actor.send({ 
        type: 'GAME_DATA_LOADED', 
        characterId: '0xabc123',
        sessionKeyState: SessionKeyState.MISSING
      });
      
      // Update session key
      actor.send({ type: 'SESSION_KEY_UPDATED', sessionKeyAddress: '0xsessionkey' });
      expect(actor.getSnapshot().value).toBe('sessionKeyUpdating');
      
      // Complete update
      actor.send({ type: 'SESSION_KEY_VALID' });
      expect(actor.getSnapshot().value).toBe('ready');
    });
  });

  it('should handle wallet disconnection from any state', () => {
    const actor = createActor(appInitializerMachine, {
      input: { walletAddress: '0x123' }
    });
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
    actor.send({ type: 'WALLET_DISCONNECTED' });
    
    expect(actor.getSnapshot().value).toBe('noWallet');
    expect(actor.getSnapshot().context.walletAddress).toBeNull();
    expect(actor.getSnapshot().context.characterId).toBeNull();
  });

  it('should handle errors correctly', () => {
    const actor = createActor(appInitializerMachine, {
      input: { walletAddress: '0x123' }
    });
    actor.start();
    
    const error = new Error('Game data failed to load');
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
    actor.send({ type: 'GAME_DATA_ERROR', error });
    
    expect(actor.getSnapshot().value).toBe('error');
    expect(actor.getSnapshot().context.error).toBe(error);
    expect(stateToAuthState[actor.getSnapshot().value as string]).toBe(AuthState.ERROR);
  });

  it('should retry from error state', () => {
    const actor = createActor(appInitializerMachine, {
      input: { walletAddress: '0x123' }
    });
    actor.start();
    
    // Get to error state
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
    actor.send({ type: 'GAME_DATA_ERROR', error: new Error('Failed') });
    
    // Retry
    actor.send({ type: 'RETRY' });
    
    expect(actor.getSnapshot().value).toBe('loadingGameData');
  });
  
  it('should handle character death and revival', () => {
    const actor = createActor(appInitializerMachine, {
      input: { walletAddress: '0x123' }
    });
    actor.start();
    
    // Get to ready state
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
    actor.send({ 
      type: 'GAME_DATA_LOADED', 
      characterId: '0xabc123',
      sessionKeyState: SessionKeyState.VALID
    });
    
    expect(actor.getSnapshot().value).toBe('ready');
    
    // Character dies
    actor.send({ type: 'CHARACTER_DIED' });
    expect(actor.getSnapshot().value).toBe('characterDead');
    
    // Character revives
    actor.send({ type: 'CHARACTER_REVIVED' });
    // After revival, we go through checkingSessionKey which evaluates to ready (since we have VALID state)
    expect(actor.getSnapshot().value).toBe('ready');
  });
  
  it('should update hasSeenWelcome through ONBOARDING_COMPLETE', () => {
    const actor = createActor(appInitializerMachine, {
      input: { walletAddress: '0x123', hasSeenWelcome: false }
    });
    actor.start();
    
    actor.send({ type: 'CONTRACT_CHECK_COMPLETE' });
    actor.send({ type: 'WALLET_INITIALIZED', hasEmbeddedWallet: true });
    
    expect(actor.getSnapshot().context.hasSeenWelcome).toBe(false);
    
    actor.send({ type: 'ONBOARDING_COMPLETE' });
    
    expect(actor.getSnapshot().context.hasSeenWelcome).toBe(true);
  });
});