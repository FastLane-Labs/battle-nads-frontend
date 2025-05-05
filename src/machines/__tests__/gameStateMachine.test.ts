import { createActor } from 'xstate';
import { gameMachine } from '../gameStateMachine';

describe('Game State Machine', () => {
  it('should start in checkingWallet state', () => {
    const actor = createActor(gameMachine);
    actor.start();
    expect(actor.getSnapshot().value).toBe('checkingWallet');
  });

  // Test transitions with actor-based approach
  it('should transition to noOwnerWallet when WALLET_DISCONNECTED event is received', () => {
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'WALLET_DISCONNECTED' });
    expect(actor.getSnapshot().value).toBe('noOwnerWallet');
  });

  it('should transition to checkingCharacter and save owner when WALLET_CONNECTED event is received', () => {
    const ownerAddress = '0x123456789';
    const actor = createActor(gameMachine);
    actor.start();
    
    actor.send({ 
      type: 'WALLET_CONNECTED', 
      owner: ownerAddress 
    });
    
    const state = actor.getSnapshot();
    expect(state.value).toBe('checkingCharacter');
    expect(state.context.owner).toBe(ownerAddress);
  });

  it('should transition to noCharacter when NO_CHARACTER_FOUND event is received', () => {
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'WALLET_CONNECTED', owner: '0x1' });
    actor.send({ type: 'NO_CHARACTER_FOUND' });
    
    expect(actor.getSnapshot().value).toBe('noCharacter');
  });

  it('should transition to checkingSessionKey and save characterId when CHARACTER_SELECTED event is received', () => {
    const characterId = '0xabc123';
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'WALLET_CONNECTED', owner: '0x1' });
    actor.send({ 
      type: 'CHARACTER_SELECTED', 
      characterId 
    });
    
    const state = actor.getSnapshot();
    expect(state.value).toBe('checkingSessionKey');
    expect(state.context.characterId).toBe(characterId);
  });

  it('should transition to sessionKeyWarning when SESSION_KEY_INVALID event is received', () => {
    const warning = 'Session key is expired';
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'WALLET_CONNECTED', owner: '0x1' });
    actor.send({ type: 'CHARACTER_SELECTED', characterId: '0x2' });
    actor.send({ 
      type: 'SESSION_KEY_INVALID',
      warning
    });
    
    const state = actor.getSnapshot();
    expect(state.value).toBe('sessionKeyWarning');
    expect(state.context.warning).toBe(warning);
  });

  it('should transition to ready when SESSION_KEY_VALID event is received', () => {
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'WALLET_CONNECTED', owner: '0x1' });
    actor.send({ type: 'CHARACTER_SELECTED', characterId: '0x2' });
    actor.send({ type: 'SESSION_KEY_VALID' });
    
    expect(actor.getSnapshot().value).toBe('ready');
  });

  it('should transition to error and save error message when ERROR event is received', () => {
    const errorMessage = 'Something went wrong';
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ 
      type: 'ERROR',
      message: errorMessage
    });
    
    const state = actor.getSnapshot();
    expect(state.value).toBe('error');
    expect(state.context.errorMessage).toBe(errorMessage);
  });

  it('should transition back to checkingSessionKey when FIX_KEY event is received in sessionKeyWarning state', () => {
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'WALLET_CONNECTED', owner: '0x1' });
    actor.send({ type: 'CHARACTER_SELECTED', characterId: '0x2' });
    actor.send({ type: 'SESSION_KEY_INVALID', warning: 'Expired' });
    actor.send({ type: 'FIX_KEY' });
    
    expect(actor.getSnapshot().value).toBe('checkingSessionKey');
  });

  it('should transition back to checkingWallet when RETRY event is received in error state', () => {
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'ERROR', message: 'Test error' });
    actor.send({ type: 'RETRY' });
    
    const state = actor.getSnapshot();
    expect(state.value).toBe('checkingWallet');
    expect(state.context.errorMessage).toBeUndefined();
  });

  // Testing full workflow with actors
  it('should handle a complete happy path flow', async () => {
    const ownerAddress = '0x123456789';
    const characterId = '0xabc123';
    
    const actor = createActor(gameMachine);
    actor.start();
    
    // Simulate a complete flow
    actor.send({ type: 'WALLET_CONNECTED', owner: ownerAddress });
    actor.send({ type: 'CHARACTER_SELECTED', characterId });
    actor.send({ type: 'SESSION_KEY_VALID' });
    
    const finalState = actor.getSnapshot();
    expect(finalState.value).toBe('ready');
    expect(finalState.context.owner).toBe(ownerAddress);
    expect(finalState.context.characterId).toBe(characterId);
  });

  it('should handle session key issues and recovery', async () => {
    const ownerAddress = '0x123456789';
    const characterId = '0xabc123';
    const warning = 'Session key is expired';
    
    const actor = createActor(gameMachine);
    actor.start();
    
    // Simulate flow with session key issue and recovery
    actor.send({ type: 'WALLET_CONNECTED', owner: ownerAddress });
    expect(actor.getSnapshot().value).toBe('checkingCharacter');
    
    actor.send({ type: 'CHARACTER_SELECTED', characterId });
    expect(actor.getSnapshot().value).toBe('checkingSessionKey');
    
    actor.send({ type: 'SESSION_KEY_INVALID', warning });
    expect(actor.getSnapshot().value).toBe('sessionKeyWarning');
    
    actor.send({ type: 'FIX_KEY' });
    expect(actor.getSnapshot().value).toBe('checkingSessionKey');
    
    actor.send({ type: 'SESSION_KEY_VALID' });
    expect(actor.getSnapshot().value).toBe('ready');
    
    const finalState = actor.getSnapshot();
    expect(finalState.context.owner).toBe(ownerAddress);
    expect(finalState.context.characterId).toBe(characterId);
  });
}); 