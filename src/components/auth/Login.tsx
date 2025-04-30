'use client';

import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

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
          
          <div className="relative mt-4 group">
            {/* Animated glow effect */}
            <div className="absolute inset-0 -m-1 bg-yellow-500/10 rounded-md blur-md z-0 animate-pulse-slow"></div>
            
            {/* Button */}
            <div className="relative animate-float">
              <img 
                src="/assets/buttons/primary-button.webp" 
                alt="" 
                className="w-full h-[60px] object-fill transition-all duration-200 
                  group-hover:brightness-125 group-hover:scale-[1.02] group-active:brightness-90 group-active:scale-[0.98]" 
              />
              
              <button 
                className={`absolute inset-0 h-[60px] w-full text-xl font-bold uppercase bg-transparent border-0 px-8
                  transition-transform duration-200 group-hover:scale-105 group-active:scale-95 flex items-center justify-center
                  ${(!ready || authenticated) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleLogin}
                disabled={!ready || authenticated}
              >
                <p className='gold-text animate-pulse-text'>
                  {!ready ? 'Connecting...' : authenticated ? 'Connected' : 'Connect Wallet'}
                </p>
              </button>
            </div>
          </div>
          
          <p className="text-gray-300/95 text-center mt-3 max-w-md">
            Connect your wallet to enter the world of Battle Nads and begin your adventure
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 