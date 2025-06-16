# BattleNads Frontend 

This is a Next.js frontend for the BattleNads game, a web3 RPG built on Monad.

## Features

- Web3 authentication via Privy
- Create and manage BattleNad characters
- Move around the game world
- Battle other players and monsters
- Manage equipment and attributes
- Blockchain integration for game state

## Getting Started

This frontend requires Node.js version 18.17.1 (as specified in `.nvmrc`).

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:
   Create a `.env.local` file with necessary configuration (see `.env.local.example` if available)

3. Start the development server:

```bash
npm run dev
```

4. Open the URL displayed in your terminal (usually http://localhost:3000)

## Build for Production

```bash
npm run build
npm start
```

## Technical Stack

- Next.js 14.1.0
- React 18
- TypeScript
- Privy Auth for Web3 authentication
- Ethers.js for blockchain interaction
- Recoil for state management
- Chakra UI + TailwindCSS for styling

## Project Structure

- `src/app/`: Next.js App Router pages and layouts
- `src/components/`: Reusable UI components
- `src/providers/`: React context providers (Auth, Wallet)
- `src/hooks/`: Custom React hooks
- `src/state/`: Recoil state management
- `src/utils/`: Utility functions
- `src/abis/`: Ethereum contract ABIs
- `public/`: Static assets

## Game Mechanics

The game allows users to:

1. Connect their web3 wallet via Privy
2. Create a character with customizable attributes
3. Explore a multi-level game world
4. Encounter and battle with other players and monsters
5. Collect and equip weapons and armor
6. Level up and allocate attribute points

## Development Status

The application is actively being developed with full blockchain integration on the Monad network.
