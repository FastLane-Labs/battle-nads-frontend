import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CharacterCreation from './pages/CharacterCreation';

// Simple Home component for now
const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-4">Battle Nads</h1>
      <p className="mb-6 text-lg">Welcome to the Battle Nads game on Monad blockchain!</p>
      <a href="/character" className="btn btn-primary">Create Character</a>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/character" element={<CharacterCreation />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App; 