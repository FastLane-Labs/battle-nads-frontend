# Phantom Wallet Integration Troubleshooting

## Issue Description

**Problem**: Phantom wallet integration is not working on the main Battle Nads app but works on a test page.

**Original Error**: 
```
Unhandled Runtime Error: cannot dequeue privy:iframe:ready event: no event found for id id-0
```

**Status**: 
- ✅ Working: http://localhost:3000/phantom-with-wallet (test page)
- ❌ Not Working: http://localhost:3000/ (main app)

## Root Cause Analysis

The issue appears to be caused by direct `window.ethereum` access interfering with Privy's iframe-based wallet handling system. Privy uses iframes for secure wallet interactions, and direct ethereum provider access can disrupt this.

## Fixes Implemented

### 1. WalletProvider Replacement

**What was done**: Replaced the original WalletProvider with a new implementation that:
- Removes all direct `window.ethereum` access
- Removes ethereum event listeners
- Relies entirely on Privy's wallet state management
- Maintains full feature parity with the original

**Key changes**:
```typescript
// OLD: Direct ethereum access
if (typeof window !== 'undefined' && window.ethereum) {
  // This interferes with Privy's iframe handling
}

// NEW: Privy-only approach
const { wallets } = useWallets(); // Use Privy's wallet state
```

**Result**: Fixed the "Initializing Wallet..." loading screen issue

### 2. useWalletConnectionStatus Hook Fix

**What was done**: Removed all `window.ethereum` access from the hook
- Removed direct ethereum provider checks
- Removed event listeners for accountsChanged, chainChanged, etc.
- Now uses WalletProvider state instead

**File**: `/src/hooks/wallet/useWalletConnectionStatus.ts`

## Testing Results

### What Works ✅
1. The test page at `/phantom-with-wallet` successfully connects to Phantom
2. The new WalletProvider maintains all features:
   - currentWallet tracking
   - sessionKey support
   - injectedWallet and embeddedWallet info
   - Network switching
   - sendPrivyTransaction method

### What Doesn't Work ❌
1. Main app still fails to connect to Phantom even after:
   - Replacing WalletProvider
   - Removing all window.ethereum access
   - Simplifying components
   - Removing providers from the stack

## Troubleshooting Steps Taken

### 1. Component Isolation
- Created `LoginSimple.tsx` without wallet hooks
- Commented out `useSimplifiedGameState` hook
- Commented out `OnboardingManager` component
- **Result**: Still doesn't work

### 2. Provider Stack Testing
```typescript
// Commented out providers one by one:
<PrivyAuthProvider>
  {/* <WalletProvider> */}      // Removed - still doesn't work
    {/* <OptimisticUpdatesProvider> */}  // Removed - still doesn't work
      <ChakraProvider>
        {children}
      </ChakraProvider>
    {/* </OptimisticUpdatesProvider> */}
  {/* </WalletProvider> */}
</PrivyAuthProvider>
```

### 3. Hook Dependencies
- Removed `useWalletConnectionStatus` usage
- Removed all `useWallet` calls
- **Result**: Still doesn't work

## Configuration Comparison

### Working Test Page (`phantom-with-wallet.tsx`)
```typescript
<PrivyProvider
  appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
  config={{
    appearance: {
      theme: "light",
      walletChainType: "ethereum-only",
    },
    defaultChain: monadTestnet,
    supportedChains: [monadTestnet],
    loginMethods: ["wallet"],
    embeddedWallets: {
      createOnLogin: 'all-users'
    },
    walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  }}
>
```

### Main App (`PrivyAuthProvider.tsx`)
- Uses a custom wrapper around PrivyProvider
- May have different configuration
- Nested within multiple other providers

## Remaining Issues to Investigate

1. **PrivyAuthProvider Configuration**
   - Compare exact configuration with working test page
   - Check for any additional settings or wrappers

2. **Global Scripts/Effects**
   - Check for any global scripts that might interfere
   - Look for any initialization code that runs before providers

3. **Provider Initialization Order**
   - The order of provider nesting might matter
   - Some provider might be initializing before Privy is ready

4. **Build/Bundle Differences**
   - Test page uses pages router
   - Main app uses app router
   - Could be a Next.js routing-related issue

## Solution Found! ✅

### Root Cause
The issue was in `ReactQueryProvider` - it was using a `bigintSerializer` that modified the global `JSON.stringify` method. This interfered with Privy's iframe communication system, preventing Phantom wallet from connecting properly.

### The Fix
1. **Removed global JSON modification** from ReactQueryProvider
2. **Implemented custom serialization** for BigInt handling that doesn't affect global methods:
   ```typescript
   const customSerializer = (data: any): string => {
     return JSON.stringify(data, (key, value) => {
       if (typeof value === 'bigint') {
         return { __type: 'bigint', value: value.toString() };
       }
       return value;
     });
   };
   ```

### Key Learnings
1. **Never modify global methods** like `JSON.stringify` - it can break third-party libraries
2. **Privy uses iframes** for secure wallet communication, which relies on JSON message passing
3. **Test providers incrementally** when debugging - add them one by one to isolate issues
4. **React StrictMode** in Next.js app directory can also cause issues with some wallet libraries

## Code Locations

- **WalletProvider**: `/src/providers/WalletProvider.tsx`
- **Test Page (Working)**: `/src/pages/phantom-with-wallet.tsx`
- **Main App Layout**: `/src/app/layout.tsx`
- **AppInitializer**: `/src/components/AppInitializer.tsx`
- **PrivyAuthProvider**: `/src/providers/PrivyAuthProvider.tsx`

## Environment

- **Privy SDK**: @privy-io/react-auth@2.8.2
- **Next.js**: 14.2.30
- **Network**: Monad Testnet (Chain ID: 10143)
- **Wallet**: Phantom (EVM support)