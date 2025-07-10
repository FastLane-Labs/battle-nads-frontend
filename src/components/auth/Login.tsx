'use client';

import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { GameButton } from '../ui';
import { useWalletConnectionStatus } from '../../hooks/wallet/useWalletConnectionStatus';

const Login: React.FC = () => {
  const { login, ready, authenticated } = usePrivy();
  const { 
    isWrongNetwork, 
    networkSwitching, 
    connectionError, 
    retryConnection
  } = useWalletConnectionStatus();
  
  const [isConnecting, setIsConnecting] = useState(false);
  
  const handleLogin = async () => {
    if (!ready || authenticated) return;
    
    try {
      setIsConnecting(true);
      login();
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleRetry = async () => {
    if (connectionError) {
      await retryConnection();
    } else {
      await handleLogin();
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

          <div className="flex flex-col items-center space-y-4">
            <GameButton
              variant="primary"
              onClick={handleLogin}
              isDisabled={!ready || authenticated || networkSwitching}
              loading={!ready || isConnecting || networkSwitching}
              loadingText={
                networkSwitching 
                  ? "Switching Network..." 
                  : isConnecting 
                    ? "Connecting..." 
                    : "Loading..."
              }
              withAnimation={true}
              hasGlow={true}
              className="mt-4 relative"
            >
              {authenticated ? 'Connected' : 'Connect Wallet'}
            </GameButton>
            
            {/* Connection Status Indicators - Prioritized */}
            {(() => {
              // Priority 1: Connection Error
              if (connectionError) {
                return (
                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-gray-300 text-center text-xs max-w-sm">
                      {connectionError}
                    </p>
                    <GameButton
                      variant="compact"
                      onClick={handleRetry}
                      className="text-sm px-4 py-2"
                    >
                      Retry Connection
                    </GameButton>
                  </div>
                );
              }
              
              // Priority 2: Wrong Network (lowest priority)
              if (isWrongNetwork) {
                return (
                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-gray-300 text-center text-xs max-w-sm">
                      Connecting will automatically switch to Monad Testnet
                    </p>
                  </div>
                );
              }
              
              // No errors - return null
              return null;
            })()}
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