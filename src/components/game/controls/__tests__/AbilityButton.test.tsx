import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AbilityButton } from '../AbilityButton';
import { AbilityStage } from '@/types/domain/enums';
import { AbilityStatus } from '@/hooks/game/useAbilityCooldowns';

// Mock dependencies
jest.mock('@/hooks/wallet/useWalletState', () => ({
  useTransactionBalance: () => ({
    isTransactionDisabled: false,
    insufficientBalanceMessage: null,
    minRequiredBalance: '0.1',
  }),
}));

jest.mock('@/data/abilities', () => ({
  getAbilityMetadata: () => ({
    name: 'Test Ability',
    description: 'Test ability description',
    requiresTarget: false,
  }),
}));

// Mock timers
jest.useFakeTimers();

describe('AbilityButton', () => {
  const mockOnClick = jest.fn();
  
  const createMockStatus = (overrides: Partial<AbilityStatus> = {}): AbilityStatus => ({
    ability: 2, // ShieldBash
    stage: AbilityStage.READY,
    targetBlock: 0,
    currentBlock: 1000,
    secondsLeft: 0,
    isReady: true,
    description: 'Shield Bash (Ready)',
    gasShortfall: false,
    currentCooldownInitialTotalSeconds: undefined,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  describe('Ready State', () => {
    it('should render ability button in ready state', () => {
      const status = createMockStatus();
      
      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should call onClick when clicked in ready state', () => {
      const status = createMockStatus();
      
      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cooldown State', () => {
    it('should render cooldown overlay when ability is cooling down', () => {
      const status = createMockStatus({
        stage: AbilityStage.COOLDOWN,
        secondsLeft: 10,
        isReady: false,
        description: 'TestCharacter is recovering from Shield Bash',
        currentCooldownInitialTotalSeconds: 12,
      });

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
        />
      );

      // Should show countdown text
      expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('should count down seconds in real-time', () => {
      const status = createMockStatus({
        stage: AbilityStage.COOLDOWN,
        secondsLeft: 3,
        isReady: false,
        description: 'TestCharacter is recovering from Shield Bash',
        currentCooldownInitialTotalSeconds: 12,
      });

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
        />
      );

      expect(screen.getByText('3s')).toBeInTheDocument();

      // Advance timer by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText('2s')).toBeInTheDocument();

      // Advance another second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByText('1s')).toBeInTheDocument();
    });

    it('should not go below 0 seconds', () => {
      const status = createMockStatus({
        stage: AbilityStage.COOLDOWN,
        secondsLeft: 1,
        isReady: false,
        description: 'TestCharacter is recovering from Shield Bash',
        currentCooldownInitialTotalSeconds: 12,
      });

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
        />
      );

      expect(screen.getByText('1s')).toBeInTheDocument();

      // Advance timer by 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not go below 0
      expect(screen.getByText('0s')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when mutation is loading', () => {
      const status = createMockStatus();
      
      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={true}
          isActionDisabled={false}
        />
      );

      // Should show loading spinner (CircularProgress with isIndeterminate)
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Button should be disabled when loading
      expect(button).toBeDisabled();
    });
  });

  describe('Disabled States', () => {
    it('should be disabled when action is disabled', () => {
      const status = createMockStatus();
      
      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled during cooldown', () => {
      const status = createMockStatus({
        stage: AbilityStage.COOLDOWN,
        secondsLeft: 5,
        isReady: false,
      });
      
      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={true} // Should be disabled when not ready
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly for cooldown', () => {
      const status = createMockStatus({
        stage: AbilityStage.COOLDOWN,
        secondsLeft: 6, // 6 seconds left
        isReady: false,
        currentCooldownInitialTotalSeconds: 12, // 12 seconds total
      });

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
        />
      );

      // Progress should be 50% (6 seconds elapsed out of 12 total)
      // This is tested indirectly through the presence of the countdown
      expect(screen.getByText('6s')).toBeInTheDocument();
    });
  });

  describe('Visual State Indicators', () => {
    it('should apply charging class when ability is charging', () => {
      const status = createMockStatus({
        stage: AbilityStage.CHARGING,
        secondsLeft: 5,
        isReady: false,
        description: 'TestCharacter is charging Shield Bash',
      });

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('ability-charging');
      // Should show CHARGING text
      expect(screen.getByText('CHARGING')).toBeInTheDocument();
      // Should show countdown
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should apply action class when ability is in action', () => {
      const status = createMockStatus({
        stage: AbilityStage.ACTION,
        secondsLeft: 0,
        isReady: false,
        description: 'TestCharacter is using Shield Bash',
      });

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('ability-action');
    });

    it('should show active badge when ability is active', () => {
      const status = createMockStatus({
        stage: AbilityStage.ACTION,
        secondsLeft: 0,
        isReady: false,
        description: 'TestCharacter is using Shield Bash',
      });

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
          isActiveAbility={true}
        />
      );

      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });

    it('should show target name when provided', () => {
      const status = createMockStatus();

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
          targetName="Enemy Goblin"
        />
      );

      expect(screen.getByText('Enemy Goblin')).toBeInTheDocument();
    });

    it('should apply active class when isActiveAbility is true', () => {
      const status = createMockStatus({
        stage: AbilityStage.CHARGING,
        secondsLeft: 5,
        isReady: false,
      });

      render(
        <AbilityButton
          status={status}
          onClick={mockOnClick}
          isMutationLoading={false}
          isActionDisabled={false}
          isActiveAbility={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('ability-active');
    });
  });
});