import React from 'react';
import { render, screen } from '@testing-library/react';
import { AbilityStatusBar } from '../AbilityStatusBar';
import { useAbilityTracker } from '@/hooks/game/useAbilityTracker';
import { domain } from '@/types';
import { AbilityStage } from '@/types/domain/enums';

jest.mock('@/hooks/game/useAbilityTracker');

const mockUseAbilityTracker = useAbilityTracker as jest.MockedFunction<typeof useAbilityTracker>;

describe('AbilityStatusBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when no ability is active', () => {
    mockUseAbilityTracker.mockReturnValue({
      abilityTracker: null,
      hasActiveAbility: false,
      isAbilityActive: false,
    });

    const { container } = render(<AbilityStatusBar />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should display ability information when ability is in CHARGING stage', () => {
    mockUseAbilityTracker.mockReturnValue({
      abilityTracker: {
        activeAbility: domain.Ability.ShieldBash,
        currentStage: AbilityStage.CHARGING,
        targetBlock: 1000,
        stageProgress: 50,
        timeRemaining: 2.0,
        stageDuration: 4.0,
        isOptimistic: false,
      },
      hasActiveAbility: true,
      isAbilityActive: true,
    });

    render(<AbilityStatusBar />);
    
    expect(screen.getByText('ShieldBash')).toBeInTheDocument();
    expect(screen.getByText('Charging')).toBeInTheDocument();
    expect(screen.getByText('2.0s')).toBeInTheDocument();
  });

  it('should display ability information when ability is in ACTION stage', () => {
    mockUseAbilityTracker.mockReturnValue({
      abilityTracker: {
        activeAbility: domain.Ability.Fireball,
        currentStage: AbilityStage.ACTION,
        targetBlock: 2000,
        stageProgress: 75,
        timeRemaining: 1.0,
        stageDuration: 4.0,
        isOptimistic: false,
      },
      hasActiveAbility: true,
      isAbilityActive: true,
    });

    render(<AbilityStatusBar />);
    
    expect(screen.getByText('Fireball')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('1.0s')).toBeInTheDocument();
  });

  it('should display ability information when ability is in COOLDOWN stage', () => {
    mockUseAbilityTracker.mockReturnValue({
      abilityTracker: {
        activeAbility: domain.Ability.Pray,
        currentStage: AbilityStage.COOLDOWN,
        targetBlock: 3000,
        stageProgress: 25,
        timeRemaining: 27.0,
        stageDuration: 36.0,
        isOptimistic: false,
      },
      hasActiveAbility: true,
      isAbilityActive: true,
    });

    render(<AbilityStatusBar />);
    
    expect(screen.getByText('Pray')).toBeInTheDocument();
    expect(screen.getByText('Cooldown')).toBeInTheDocument();
    expect(screen.getByText('27.0s')).toBeInTheDocument();
  });

  it('should not display when ability is in READY stage', () => {
    mockUseAbilityTracker.mockReturnValue({
      abilityTracker: {
        activeAbility: domain.Ability.SingSong,
        currentStage: AbilityStage.READY,
        targetBlock: 0,
        stageProgress: 100,
        timeRemaining: 0,
        stageDuration: 0,
        isOptimistic: false,
      },
      hasActiveAbility: true,
      isAbilityActive: false, // READY stage is not considered active
    });

    const { container } = render(<AbilityStatusBar />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should display compact layout with ability info', () => {
    mockUseAbilityTracker.mockReturnValue({
      abilityTracker: {
        activeAbility: domain.Ability.EvasiveManeuvers,
        currentStage: AbilityStage.ACTION,
        targetBlock: 1500,
        stageProgress: 50,
        timeRemaining: 1.0,
        stageDuration: 2.0,
        isOptimistic: true,
      },
      hasActiveAbility: true,
      isAbilityActive: true,
    });

    render(<AbilityStatusBar />);
    
    // Check that all elements are present in compact form
    expect(screen.getByText('EvasiveManeuvers')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('1.0s')).toBeInTheDocument();
  });

  it('should format time with one decimal place', () => {
    mockUseAbilityTracker.mockReturnValue({
      abilityTracker: {
        activeAbility: domain.Ability.ApplyPoison,
        currentStage: AbilityStage.COOLDOWN,
        targetBlock: 5000,
        stageProgress: 10,
        timeRemaining: 28.857,
        stageDuration: 32.0,
        isOptimistic: false,
      },
      hasActiveAbility: true,
      isAbilityActive: true,
    });

    render(<AbilityStatusBar />);
    
    // Should round to 1 decimal place
    expect(screen.getByText('28.9s')).toBeInTheDocument();
  });
});