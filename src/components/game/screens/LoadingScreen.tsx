import React from 'react';
import {
  Center,
  Spinner,
  Text,
  Button
} from '@chakra-ui/react';

interface LoadingScreenProps {
  message?: string;
  showRefresh?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading game data...",
  showRefresh = false
}) => {
  return (
    <Center height="100%" color="white">
      <div
    className="bg-cover bg-center bg-no-repeat w-full h-full flex items-center justify-center"  
    style={{ backgroundImage: "url('/assets/bg/battlenads-og-bg.webp')" }}>
        <div className='flex justify-center items-center flex-col space-y-6 p-10 bg-black/60 border border-amber-900/50 rounded-lg min-w-72'>
        <h2 className="text-center text-3xl font-semibold uppercase mb-4 gold-text tracking-wide text-nowrap">
        Loading
        </h2>
          <Spinner size="xl" thickness="4px" speed="0.8s" color="yellow.500" />
          <Text fontSize="md" color="white">{message}</Text>
          {showRefresh && (
            <Button onClick={() => window.location.reload()} variant="outline">Refresh</Button>
          )}
        </div>
      </div>
    </Center>
  );
};

export default LoadingScreen; 