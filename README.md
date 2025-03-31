# BattleNads Frontend

This is a React frontend for the BattleNads game, a web3 RPG built on Monad.

## Features

- Create and manage BattleNad characters
- Move around the game world
- Battle other players and monsters
- Manage equipment and attributes

## Running with Mock Data

This frontend includes a mock data version that doesn't require blockchain connection or deployed contracts. To run it:

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the URL displayed in your terminal (usually http://localhost:5173)

The mock version simulates all blockchain interactions with predefined data and allows you to:
- Create a character
- Move around in different directions
- Attack monsters
- Change equipment
- Allocate attribute points

## Technical Stack

- React + TypeScript
- Vite for building and development
- Recoil for state management
- TailwindCSS for styling

## Game Mechanics

The game allows users to:

1. Create a character with customizable attributes
2. Explore a multi-level game world by moving in different directions
3. Encounter and battle with other players and monsters
4. Collect and equip weapons and armor
5. Level up and allocate attribute points 