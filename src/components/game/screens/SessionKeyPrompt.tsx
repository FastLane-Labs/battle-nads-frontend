import React from 'react';

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
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center py-10"
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
          
          <div className="relative mt-4 group">
            <img 
              src="/assets/buttons/primary-button.webp" 
              alt="" 
              className="absolute inset-0 w-full h-[60px] object-fill z-0 transition-all duration-200 
                group-hover:brightness-125 group-hover:scale-[1.02] group-active:brightness-90 group-active:scale-[0.98]" 
            />
            
            <button 
              className="relative h-[60px] w-full text-xl font-bold uppercase z-10 bg-transparent border-0 px-8
                transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
              onClick={onUpdate}
              disabled={isUpdating}
            >
              <p className='gold-text'>
                {isUpdating ? 'Updating...' : 'Update Session Key'}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionKeyPrompt; 