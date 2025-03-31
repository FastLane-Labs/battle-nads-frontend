import React from 'react';

interface MovementControlsProps {
  onMoveNorth: () => void;
  onMoveSouth: () => void;
  onMoveEast: () => void;
  onMoveWest: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disabled?: boolean;
}

const MovementControls: React.FC<MovementControlsProps> = ({
  onMoveNorth,
  onMoveSouth,
  onMoveEast,
  onMoveWest,
  onMoveUp,
  onMoveDown,
  disabled = false
}) => {
  return (
    <div className="game-tile p-4">
      <h2 className="text-xl font-bold mb-4">Movement</h2>
      
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="col-start-2">
          <button
            className="btn btn-primary w-full flex items-center justify-center"
            onClick={onMoveNorth}
            disabled={disabled}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="sr-only">North</span>
          </button>
        </div>
        
        <div className="col-start-1">
          <button
            className="btn btn-primary w-full flex items-center justify-center"
            onClick={onMoveWest}
            disabled={disabled}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="sr-only">West</span>
          </button>
        </div>
        
        <div className="col-start-3">
          <button
            className="btn btn-primary w-full flex items-center justify-center"
            onClick={onMoveEast}
            disabled={disabled}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="sr-only">East</span>
          </button>
        </div>
        
        <div className="col-start-2">
          <button
            className="btn btn-primary w-full flex items-center justify-center"
            onClick={onMoveSouth}
            disabled={disabled}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="sr-only">South</span>
          </button>
        </div>
      </div>
      
      {(onMoveUp || onMoveDown) && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {onMoveUp && (
            <button
              className="btn btn-secondary flex items-center justify-center"
              onClick={onMoveUp}
              disabled={disabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span>Up</span>
            </button>
          )}
          
          {onMoveDown && (
            <button
              className="btn btn-secondary flex items-center justify-center"
              onClick={onMoveDown}
              disabled={disabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span>Down</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MovementControls; 