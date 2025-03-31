import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

const Login: React.FC = () => {
  const { login } = usePrivy();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full p-6 bg-surface rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">BattleNads</h1>
          <p className="text-gray-400">Enter the world of BattleNads and conquer your enemies!</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={login}
            className="btn btn-primary w-full py-3 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-4-9a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 4a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            Connect Wallet
          </button>
          
          <div className="text-center text-sm text-gray-400 mt-8">
            <p>Connect your wallet to start playing or create a character.</p>
            <p className="mt-2">This game requires a small amount of MON to play.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 