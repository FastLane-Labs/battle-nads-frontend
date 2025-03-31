import React, { ReactNode } from 'react';

interface AppProps {
  children?: ReactNode;
}

function App({ children }: AppProps) {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Routing is now handled in index.tsx */}
      {children}
    </div>
  );
}

export default App; 