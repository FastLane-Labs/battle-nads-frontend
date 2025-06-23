'use client';

import React, { useEffect, useState } from 'react';
import Joyride, { 
  CallBackProps, 
  STATUS, 
  EVENTS, 
  ACTIONS,
  Step as JoyrideStep,
  Styles 
} from 'react-joyride';
import { useTutorial, TutorialStep } from './TutorialProvider';

// Convert our tutorial steps to Joyride format
function convertToJoyrideSteps(steps: TutorialStep[]): JoyrideStep[] {
  return steps.map(step => ({
    target: step.target,
    title: step.title,
    content: step.content,
    placement: step.placement || 'bottom',
    disableBeacon: step.disableBeacon || false,
    spotlightClicks: step.spotlightClicks || false,
    hideCloseButton: step.hideCloseButton || false,
    hideBackButton: step.hideBackButton || false,
    showProgress: step.showProgress || false,
    styles: step.styles,
  }));
}

// Custom Joyride styles for Battle Nads theme
const joyrideStyles: Partial<Styles> = {
  options: {
    primaryColor: '#F6AD55', // Orange theme color
    backgroundColor: '#1A202C', // Dark background
    overlayColor: 'rgba(0, 0, 0, 0.8)',
    spotlightShadow: '0 0 15px rgba(246, 173, 85, 0.6)',
    textColor: '#E2E8F0', // Light gray text
    width: 320,
    zIndex: 10000,
  },
  tooltip: {
    backgroundColor: '#2D3748',
    borderRadius: '8px',
    border: '1px solid #4A5568',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
  },
  tooltipTitle: {
    color: '#F6AD55',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  tooltipContent: {
    color: '#E2E8F0',
    fontSize: '14px',
    lineHeight: '1.5',
    padding: '0',
  },
  buttonNext: {
    backgroundColor: '#F6AD55',
    color: '#1A202C',
    borderRadius: '6px',
    border: 'none',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonBack: {
    backgroundColor: 'transparent',
    color: '#A0AEC0',
    border: '1px solid #4A5568',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    marginRight: '8px',
  },
  buttonSkip: {
    backgroundColor: 'transparent',
    color: '#A0AEC0',
    border: 'none',
    padding: '8px 16px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  buttonClose: {
    backgroundColor: 'transparent',
    color: '#A0AEC0',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    position: 'absolute',
    right: '8px',
    top: '8px',
  },
  spotlight: {
    borderRadius: '4px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  // Add missing required properties
  beacon: {
    backgroundColor: '#F6AD55',
  },
  beaconInner: {
    backgroundColor: '#F6AD55',
  },
  beaconOuter: {
    backgroundColor: '#F6AD55',
    border: '2px solid #F6AD55',
  },
  overlayLegacy: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  tooltipFooter: {
    marginTop: '16px',
  },
  tooltipFooterSpacer: {
    flex: '1',
  },
};

interface TutorialOverlayProps {
  // Optional props to override behavior
  continuous?: boolean;
  scrollToFirstStep?: boolean;
  showProgress?: boolean;
  showSkipButton?: boolean;
  disableOverlay?: boolean;
  disableScrolling?: boolean;
}

export function TutorialOverlay({
  continuous = true,
  scrollToFirstStep = true,
  showProgress = true,
  showSkipButton = true,
  disableOverlay = false,
  disableScrolling = false,
}: TutorialOverlayProps) {
  const {
    isActive,
    currentFlow,
    currentStepIndex,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
    stopTutorial,
  } = useTutorial();

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<JoyrideStep[]>([]);

  // Update steps when current flow changes
  useEffect(() => {
    if (currentFlow) {
      const joyrideSteps = convertToJoyrideSteps(currentFlow.steps);
      setSteps(joyrideSteps);
    } else {
      setSteps([]);
    }
  }, [currentFlow]);

  // Start/stop Joyride when tutorial state changes
  useEffect(() => {
    setRun(isActive && steps.length > 0);
  }, [isActive, steps.length]);

  // Handle Joyride callbacks
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    // Handle different events
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        nextStep();
      } else if (action === ACTIONS.PREV) {
        previousStep();
      }
    }

    // Handle status changes
    if (status === STATUS.FINISHED) {
      completeTutorial();
      setRun(false);
    } else if (status === STATUS.SKIPPED) {
      skipTutorial();
      setRun(false);
    } else if (status === STATUS.ERROR) {
      console.error('Joyride error:', data);
      stopTutorial();
      setRun(false);
    }
  };

  // Don't render if not active or no steps
  if (!isActive || !currentFlow || steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous={continuous}
      run={run}
      scrollToFirstStep={scrollToFirstStep}
      showProgress={showProgress}
      showSkipButton={showSkipButton}
      stepIndex={currentStepIndex}
      steps={steps}
      styles={joyrideStyles}
      disableOverlay={disableOverlay}
      disableScrolling={disableScrolling}
      // Additional configuration
      hideCloseButton={false}
      spotlightClicks={false}
      disableOverlayClose={true}
      // Localization
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open the dialog',
        skip: 'Skip tutorial',
      }}
      // Floating behavior
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
        offset: 10,
        placement: 'bottom',
      }}
    />
  );
}

// Helper component for triggering tutorials from buttons/links
interface TutorialTriggerProps {
  flowId: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TutorialTrigger({ 
  flowId, 
  children, 
  className = '', 
  disabled = false 
}: TutorialTriggerProps) {
  const { startTutorial, isFlowCompleted } = useTutorial();

  const handleClick = () => {
    if (!disabled) {
      startTutorial(flowId);
    }
  };

  const isCompleted = isFlowCompleted(flowId);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`tutorial-trigger ${className} ${isCompleted ? 'completed' : ''}`}
      data-testid={`tutorial-trigger-${flowId}`}
    >
      {children}
      {isCompleted && <span className="completion-badge">✓</span>}
    </button>
  );
}

// Progress indicator component
export function TutorialProgress() {
  const { currentFlow, currentStepIndex } = useTutorial();

  if (!currentFlow) {
    return null;
  }

  const progress = ((currentStepIndex + 1) / currentFlow.steps.length) * 100;

  return (
    <div className="tutorial-progress" data-testid="tutorial-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-text">
        Step {currentStepIndex + 1} of {currentFlow.steps.length}
      </div>
    </div>
  );
}

// Tutorial menu component for accessing all tutorials
interface TutorialMenuProps {
  className?: string;
}

export function TutorialMenu({ className = '' }: TutorialMenuProps) {
  const { 
    availableFlows, 
    completedFlows, 
    startTutorial, 
    isFlowCompleted,
    resetProgress 
  } = useTutorial();

  return (
    <div className={`tutorial-menu ${className}`} data-testid="tutorial-menu">
      <h3>Game Tutorials</h3>
      <div className="tutorial-list">
        {availableFlows.map(flow => (
          <div key={flow.id} className="tutorial-item">
            <div className="tutorial-info">
              <h4>{flow.name}</h4>
              <p>{flow.description}</p>
            </div>
            <TutorialTrigger
              flowId={flow.id}
              className="tutorial-start-btn"
            >
              {isFlowCompleted(flow.id) ? 'Replay' : 'Start'}
            </TutorialTrigger>
          </div>
        ))}
      </div>
      
      {completedFlows.length > 0 && (
        <div className="tutorial-actions">
          <button 
            onClick={resetProgress}
            className="reset-progress-btn"
            data-testid="reset-tutorial-progress"
          >
            Reset All Progress
          </button>
        </div>
      )}
    </div>
  );
}