import React from 'react';
import { Button } from '@chakra-ui/react';
import { LoadingIndicator } from '../../ui';

interface LoadingScreenProps {
  message?: string;
  showRefresh?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading game data...",
  showRefresh = false
}) => {
  return (
    <LoadingIndicator
      message={message}
      size="large"
      variant="fullscreen"
      backgroundImage="/assets/bg/battlenads-og-bg.webp"
      showBackground={true}
    >
      {showRefresh && (
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          mt={4}
        >
          Refresh
        </Button>
      )}
    </LoadingIndicator>
  );
};

export default LoadingScreen; 