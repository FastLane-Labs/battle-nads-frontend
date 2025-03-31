import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="relative">
      {/* Main Logo Container */}
      <div className="relative bg-black p-4 rounded-lg border-4 border-purple-500 shadow-lg">
        {/* Pixel Art Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-8 grid-rows-8 h-full">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className="bg-purple-500" />
            ))}
          </div>
        </div>

        {/* Main Text */}
        <div className="relative">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse">
            BATTLE
          </h1>
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-red-500 animate-pulse">
            NAD
          </h1>
        </div>

        {/* Pixel Art Decoration */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 animate-pulse" />
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-pink-500 animate-pulse" />
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 animate-pulse" />
        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-500 animate-pulse" />

        {/* Neon Glow Effect */}
        <div className="absolute inset-0 bg-purple-500 opacity-20 blur-xl animate-pulse" />
      </div>

      {/* Subtitle */}
      <div className="mt-2 text-center">
        <p className="text-sm text-gray-400 font-mono tracking-wider">
          A RETRO DUNGEON CRAWLER
        </p>
      </div>
    </div>
  );
};

export default Logo; 