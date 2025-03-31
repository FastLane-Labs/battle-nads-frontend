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

# Frontend Analysis Summary

This document summarizes the initial analysis of the `battle-nads-frontend` project.

## Core Technologies

*   **Framework:** [React](https://reactjs.org/) (^18.2.0)
*   **Language:** [TypeScript](https://www.typescriptlang.org/) (^5.3.3)
*   **Build Tool:** [Vite](https://vitejs.dev/) (^5.0.12)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (^3.4.1)
    *   Uses PostCSS (^8.4.35) and Autoprefixer (^10.4.17)
*   **Routing:** [React Router DOM](https://reactrouter.com/) (^6.22.0)
*   **State Management:** [Recoil](https://recoiljs.org/) (^0.7.7)

## Project Purpose

*   Based on the `package.json` description: "This is a React frontend for the BattleNads game, a web3 RPG built on Monad."

## Directory Structure

The project follows a conventional structure for React applications:

*   `public/`: Static assets.
*   `src/`: Main application source code.
    *   `index.tsx`: Application entry point (renders `App.tsx`).
    *   `App.tsx`: Root component, likely handles routing and global layout.
    *   `index.css`: Global styles / Tailwind base styles.
    *   `components/`: Reusable UI components.
    *   `pages/`: Top-level components representing application views/routes.
    *   `hooks/`: Custom React hooks.
    *   `state/`: Recoil state definitions (atoms, selectors).
    *   `utils/`: Utility functions.
    *   `types/` / `types.ts`: TypeScript type definitions.
*   `vite.config.ts`: Vite configuration.
*   `tailwind.config.js`: Tailwind CSS configuration.
*   `tsconfig.json`: TypeScript configuration.
*   `package.json`: Project metadata and dependencies.