import React, { useState } from 'react';
import { usePrivy, useLoginWithOAuth } from '@privy-io/react-auth';
import { Navigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { login, authenticated, ready } = usePrivy();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Only redirect if we're sure of the authentication state
  React.useEffect(() => {
    if (ready && authenticated && !isRedirecting) {
      setIsRedirecting(true);
      // Use a small delay to prevent potential loops
      setTimeout(() => {
        window.location.href = '/game';
      }, 100);
    }
  }, [authenticated, ready, isRedirecting]);
  
  const { initOAuth, loading: twitterLoading } = useLoginWithOAuth({
    onComplete: ({ user, isNewUser }) => {
      console.log('User logged in successfully with Twitter', user);
      // Don't redirect here - let the authenticated state update
      // The useEffect above will handle redirection once auth state changes
    },
    onError: (error) => {
      console.error('Twitter login failed', error);
    }
  });

  const handleTwitterLogin = async () => {
    try {
      await initOAuth({ provider: 'twitter' });
    } catch (err) {
      console.error('Twitter login error:', err);
    }
  };

  // Show loading when redirecting to prevent flicker
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 bg-surface rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">BattleNads</h1>
          <p className="text-gray-400">Enter the world of BattleNads and conquer your enemies!</p>
        </div>
        
        <div className="space-y-4">          
          <button
            onClick={handleTwitterLogin}
            disabled={twitterLoading}
            className="btn btn-secondary w-full py-3 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.1 10.1 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            {twitterLoading ? 'Connecting...' : 'Sign in with Twitter'}
          </button>
          <div className="text-center text-sm text-gray-400 mt-8">
            <p>Connect your wallet or social account to start playing or create a character.</p>
            <p className="mt-2">This game requires a small amount of MON to play.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 