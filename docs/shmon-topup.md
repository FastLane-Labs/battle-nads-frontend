# ShMON Top-Up System Documentation

## Overview

The ShMON (shared MONAD) top-up system provides automatic gas replenishment for Battle Nads players, ensuring uninterrupted gameplay even when session key balances run low.

## Key Concepts

### Token Types
- **MON**: Native MONAD token used for gas payments
- **ShMON**: Wrapped version of MON tokens with two states:
  - **Bonded (Committed)**: Locked for gas payments
  - **Unbonded (Liquid)**: Available for conversion to bonded

### Balance Types
- **Session Key Balance**: MON tokens in the session wallet for immediate gas
- **Committed Balance**: Bonded ShMON tokens reserved for gas replenishment
- **Liquid Balance**: Unbonded ShMON tokens available for top-up

## How It Works

### 1. Balance Monitoring
The system continuously monitors:
- Session key MON balance
- Committed ShMON balance
- Calculates shortfall when committed balance is low

### 2. Replenishment Options

#### Manual Replenishment
- Direct transfer from owner wallet MON
- Calculated as: `shortfall * TOPUP_MULTIPLIER (3)`
- Immediate one-time transfer

#### Automatic Top-Up (Recommended)
- Configures automatic conversion from unbonded to bonded ShMON
- Parameters:
  - `minBondedBalance`: Target committed balance to maintain
  - `maxTopUpPerPeriod`: Maximum ShMON conversion per period
  - `topUpPeriodDuration`: Duration of each top-up period

### 3. Configuration Constants

```typescript
// From src/config/shmon.ts
TOPUP_MULTIPLIER = 3                  // Multiplier for shortfall calculation
SAFE_REPLENISH_MULTIPLIER = 2        // Additional safety margin
MAX_TOPUP_DURATION_BLOCKS = 5760     // ~24 hours worth of blocks
DEFAULT_TOPUP_PERIOD_DURATION = 200k  // Default period for top-ups
```

## Implementation Details

### Components

1. **ShMonadAdapter** (`src/blockchain/adapters/ShMonadAdapter.ts`)
   - Interfaces with ShMON smart contract
   - Handles `setMinBondedBalance()` and `balanceOf()` calls

2. **BattleNadsClient** Extensions
   - Added ShMON adapter integration
   - New methods for top-up configuration

3. **WalletBalances Component**
   - Displays all balance types
   - Shows warnings when committed balance is low
   - Provides manual/automatic replenishment buttons

4. **useReplenishment Hook** (`src/hooks/wallet/useReplenishment.ts`)
   - Encapsulates replenishment logic
   - Handles both manual and automatic modes
   - Manages transaction state and error handling

### UI Components

- **BalanceDisplay**: Reusable balance display component
- **DirectFundingCard**: Low session key balance warning
- **ShortfallWarningCard**: Critical balance warning with actions

## User Experience

### Warning Thresholds
1. **Low Session Key** (< 0.04 MON): Shows direct funding option
2. **Low Committed Balance**: Shows critical warning with replenishment options

### Safety Features
- Prevents draining owner wallet below minimum safe balance
- Caps automatic top-up to prevent excessive conversion
- Clear visual warnings when character is at risk

## Security Considerations

- All transactions require owner wallet signature
- Top-up limits prevent accidental over-commitment
- Policy-based access control via `POLICY_ID`

## Future Enhancements

1. Historical top-up tracking
2. Predictive balance warnings based on usage patterns
3. Customizable top-up thresholds
4. Multi-character balance management