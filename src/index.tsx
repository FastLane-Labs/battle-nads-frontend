import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import './index.css';
import App from './App';
import Login from './pages/Login';
import CharacterCreation from './pages/CharacterCreation';
import GameDemo from './components/GameDemo';
// import ProtectedRoute from './components/ProtectedRoute';

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
    <RecoilRoot>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GamePage />} />
          <Route path="/create" element={<CharacterPage />} />
          {/* <Route path="/" element={<Login />} />
          <Route path="/create" element={<ProtectedRoute><CharacterCreation /></ProtectedRoute>} />
          <Route path="/game" element={<ProtectedRoute><GameBoard /></ProtectedRoute>} /> */}
        </Routes>
      </BrowserRouter>
    </RecoilRoot>
  </React.StrictMode>
); 