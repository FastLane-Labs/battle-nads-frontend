'use client';

import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { GameButton } from '../ui';

const Login: React.FC = () => {
  const { login, ready, authenticated } = usePrivy();
  
  const handleLogin = () => {
    if (ready && !authenticated) {
      login();
    }
  };

  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center py-10"
      style={{ backgroundImage: "url('/assets/bg/dark-smoky-bg.webp')" }}
    >
      <div className="max-w-[600px] w-full mx-auto px-4">
        <div className="flex flex-col items-center space-y-8">
          <img 
            src="/BattleNadsLogo.webp" 
            alt="Battle Nads Logo"
            className="max-w-[300px] md:max-w-[335px] mx-auto"
          />
          
          <h2 className="text-center text-2xl md:text-3xl font-semibold uppercase mb-4 gold-text tracking-wider leading-10 text-nowrap">
            Adventure Awaits
          </h2>

          <GameButton
            variant="primary"
            onClick={handleLogin}
            isDisabled={!ready || authenticated}
            loading={!ready}
            loadingText="Connecting..."
            withAnimation={true}
            hasGlow={true}
            className="mt-4 relative"
          >
            {authenticated ? 'Connected' : 'Connect Wallet'}
          </GameButton>
          
          <p className="text-gray-300/95 text-center mt-3 max-w-md">
            Connect your wallet to enter the world of Battle Nads and begin your adventure
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 