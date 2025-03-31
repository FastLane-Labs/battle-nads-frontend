import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import './index.css';
import App from './App';
import Login from './pages/Login';
import CharacterCreation from './pages/CharacterCreation';
import GameDemo from './components/GameDemo';
import ProtectedRoute from './components/ProtectedRoute';
import { PrivyAuthProvider } from './providers/PrivyAuthProvider';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const GamePage = () => (
  <App>
    <GameDemo />
  </App>
);

const CharacterPage = () => (
  <App>
    <CharacterCreation />
  </App>
);

root.render(
  <React.StrictMode>
    <PrivyAuthProvider>
      <RecoilRoot>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/game" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CharacterPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </RecoilRoot>
    </PrivyAuthProvider>
  </React.StrictMode>
); 