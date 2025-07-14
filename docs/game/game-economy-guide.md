# Battle Nads Economy Guide

## Understanding shMON

Battle Nads uses **shMON** (staked MON) to demonstrate a functional blockchain game economy.

### Token System Basics

- **shMON** = Staked MON locked in the game
- **Character Balance**: Earned by defeating enemies, lost on death
- **Bonded Balance**: Minimum 0.05 shMON required for auto-defense
- **Yield Distribution**: 25% of defeated player balances boost yield for all holders

### Auto-Defense Mechanism

Your bonded shMON enables automatic defense when attacked:
- Other players can attack you even when offline
- Your character automatically defends using bonded shMON
- Without sufficient bonded shMON, you cannot defend yourself
- Keep bonded shMON funded to protect your earned character balance

### Cost Structure

**Starting Costs**
- Character creation: 0.1 shMON buy-in
- Minimum bonded: 0.05 shMON for operations
- Total needed: ~0.15 MON to start playing

**Operational Costs**
- Each action costs ~0.003-0.005 MON from bonded balance
- Daily active play: ~0.1-0.3 MON depending on activity

### Economic Flow

```mermaid
flowchart LR
    A[Player Dies] --> B[Character Balance Lost]
    B --> C[75% to Victor]
    B --> D[25% to Yield Pool]
    D --> E[All shMON Holders]
    
    C --> F[Victor's Character Balance]
    E --> G[Proportional Distribution]
    
    style A fill:#e74c3c,stroke:#c0392b,color:#fff
    style B fill:#95a5a6,stroke:#7f8c8d,color:#fff
    style C fill:#27ae60,stroke:#229954,color:#fff
    style D fill:#3498db,stroke:#2874a6,color:#fff
    style E fill:#9b59b6,stroke:#8e44ad,color:#fff
```

This creates:
- Risk/reward gameplay mechanics
- Passive income for all participants
- Natural wealth redistribution

### Basic Strategies

**Conservative**: Fight weaker enemies, maintain small balance, earn steady yield

**Aggressive**: Target players and strong enemies, risk large balance for big rewards

**Balanced**: Mix safe farming with calculated risks, cash out gains periodically

### Technical Demonstration

The economy showcases:
- Fully on-chain token economics
- Automated yield distribution
- Gas abstraction for seamless transactions
- Economic game theory in practice

Battle Nads proves that complex token economies can operate entirely on blockchain without centralized management.