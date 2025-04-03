# Frontend Architecture Analysis (BattleNads)

This document outlines the architecture of the `battle-nads-frontend` application based on an analysis conducted on April 3, 2024.

## 1. Overview

The frontend is a single-page application built with Next.js. Its primary purpose is to serve as the user interface for the "BattleNads" web3 RPG built on Monad.

## 2. Core Technologies

*   **Framework:** Next.js (14.1.0)
*   **Base Libraries:** React (^18.2.0), React DOM (^18.2.0)
*   **Language:** TypeScript (^5)
*   **Authentication:** Privy Auth (@privy-io/react-auth ^2.8.0)
*   **Styling:** 
    * Tailwind CSS (^3.4.1) (with PostCSS/Autoprefixer)
    * Chakra UI (@chakra-ui/react ^2.10.7)
*   **Routing:** Next.js App Router (built-in)
*   **State Management:** Recoil (^0.7.7)
*   **Blockchain Interaction:** ethers (^6.13.5)
*   **Package Manager:** npm (Node version 18.17.1 specified in .nvmrc)

## 3. Project Structure

The project follows the Next.js 14 App Router structure:

*   `src/app/`: Main application pages and layouts
    *   `page.tsx`: Root/index page
    *   `layout.tsx`: Root layout component with providers
    *   `globals.css`: Global styles
    *   `theme.ts`: Chakra UI theme configuration
    *   Feature directories:
        *   `dashboard/`
        *   `game/`
        *   `character/`
        *   `create/`
*   `src/components/`: Reusable UI components
*   `src/providers/`: React context providers
    *   `PrivyAuthProvider`: Authentication provider
    *   `WalletProvider`: Blockchain wallet provider
*   `src/hooks/`: Custom React hooks
*   `src/state/`: Recoil atom/selector definitions
*   `src/utils/`: Utility functions
*   `src/types/`: TypeScript type definitions
*   `src/abis/`: Ethereum contract ABIs
*   `public/`: Static assets

## 4. Application Flow & Key Components

1.  **Entry Point (`src/app/layout.tsx`):**
    *   Initializes React rendering
    *   Wraps the application in:
        *   `PrivyAuthProvider`: Provides authentication context
        *   `WalletProvider`: Provides wallet/blockchain connection
        *   `RecoilRoot`: Provides Recoil state context
        *   `ChakraProvider`: Provides Chakra UI theming
    *   Imports global CSS (`globals.css`)

2.  **Authentication:**
    *   Uses Privy Auth for web3 authentication
    *   Managed through the PrivyAuthProvider

## 5. State Management

*   **Global State:** Recoil is used for managing application-wide state
*   **Authentication State:** Managed through Privy Auth provider
*   **Blockchain State:** Managed through the WalletProvider

## 6. Design System

*   The application uses a combination of:
    *   Chakra UI for component library
    *   Tailwind CSS for utility-based styling
    *   Custom theme settings defined in `src/app/theme.ts`

## 7. Current Status & Future Direction

*   The application is a web3 RPG frontend with authentication, character management, and game mechanics
*   Integration with Monad blockchain for game state and transactions
*   User authentication via Privy provides web3 wallet connections
