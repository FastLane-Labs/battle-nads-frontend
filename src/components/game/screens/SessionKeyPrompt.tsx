import React from 'react';
import { GameButton } from '../../ui';

interface SessionKeyPromptProps {
  sessionKeyState: string;
  onUpdate: () => Promise<void>;
  isUpdating: boolean;
}

const SessionKeyPrompt: React.FC<SessionKeyPromptProps> = ({
  sessionKeyState,
  onUpdate,
  isUpdating
}) => {
  return (
    <div 
      className="h-full w-full bg-cover bg-center bg-no-repeat flex items-center justify-center py-10"
      style={{ backgroundImage: "url('/assets/bg/dark-smoky-bg.webp')" }}
    >
      <div className="max-w-[600px] w-full mx-auto px-4">
        <div className="flex flex-col items-center space-y-6">
          <img 
            src="/BattleNadsLogo.webp" 
            alt="Battle Nads Logo"
            className="max-w-[300px] md:max-w-[335px] mx-auto"
          />
          
          <h2 className="text-center text-3xl font-semibold uppercase mb-4 gold-text tracking-wider leading-10">
            Session Key Update Required
          </h2>
          
          <div className="bg-black/70 border border-amber-900/50 rounded-lg p-2 md:p-4 w-auto">
            <div className="flex items-center">
              <div className="flex-shrink-0 pt-0.5">
                <img 
                  src="/assets/icons/warning.webp" 
                  alt="Warning" 
                  className="h-6 w-6"
                />
              </div>
              <div className="ml-2">
                <p className="text-yellow-400 text-sm sm:text-lg">
                  Your session key needs to be updated ({sessionKeyState})
                </p>
              </div>
            </div>
          </div>
          
          <div className="w-auto max-w-[300px] mx-auto">
            <GameButton
              variant="primary"
              onClick={onUpdate}
              isDisabled={isUpdating}
              loading={isUpdating}
              loadingText="Updating..."
              className="mt-4"
            >
              Update Session Key
            </GameButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionKeyPrompt; 