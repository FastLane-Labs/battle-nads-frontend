# FAQ & Troubleshooting Guide

## 🔧 Common Issues & Solutions

### Character Creation Problems

#### Q: "Transaction failed" when creating character
**A:** Check these common causes:
- **Insufficient MON balance** - Need ~0.15 MON total (0.1 buy-in + 0.05 bonded + gas)
- **Wrong network** - Ensure you're connected to Monad network
- **Gas limit too low** - Character creation requires ~850,000 gas
- **Stat allocation error** - Must allocate exactly 32 points across all attributes

#### Q: My character isn't spawning after creation
**A:** Character spawning takes **8 blocks (~4 minutes)**. This is normal - the blockchain needs time to process your character creation and find a safe spawn location.

#### Q: "Invalid character name" error
**A:** Character names must:
- Be 1-32 characters long
- Contain only letters, numbers, and basic punctuation
- Not be already taken by another player
- Not contain inappropriate content

### Wallet & Transaction Issues

#### Q: Can't connect wallet to the game
**A:** Try these steps:
1. **Check network** - Switch to Monad network in your wallet
2. **Clear browser cache** - Close and reopen browser
3. **Disable other wallet extensions** - Conflicts can occur
4. **Try different wallet** - MetaMask, WalletConnect, etc.
5. **Check wallet permissions** - Ensure you've approved connection

#### Q: Session key setup failing
**A:** Session key issues are usually caused by:
- **Insufficient gas balance** - Need MON for session key transactions
- **Expired session** - Try refreshing and reconnecting wallet
- **Invalid parameters** - Session keys must have valid expiration time
- **Contract interaction failed** - Check network status and try again

#### Q: "Insufficient funds" but I have MON
**A:** Different types of balances:
- **Wallet balance** - MON in your wallet for transactions
- **Bonded balance** - MON locked in game contract for character actions
- **Available balance** - Your character's earned game balance
- Make sure you have enough **wallet MON** for the specific action

### Gameplay Issues

#### Q: Can't move my character
**A:** Movement is restricted when:
- **In combat** - Wait for combat to complete (automated)
- **Character is dead** - Create new character or revive
- **Task system overloaded** - Try again in a few moments
- **Insufficient bonded balance** - Add more MON for task execution

#### Q: Combat seems stuck or not responding
**A:** Combat in Battle Nads is **automated and turn-based**:
- Turns execute every few seconds based on character quickness
- You can't manually control combat actions once engaged
- Combat continues until one side dies or flees
- Check combat log for detailed turn-by-turn results

#### Q: My abilities are grayed out
**A:** Abilities have **cooldowns** measured in blocks:
- Each ability shows remaining cooldown time
- Cooldowns vary by class and ability (0-72 blocks)
- Hover over ability for detailed cooldown information
- Some abilities can't be used while in certain states

#### Q: Character deleted or disappeared
**A:** Characters are deleted when:
- **Bonded balance drops below 0.05 MON** - Can't pay for task execution
- **Death with insufficient revival resources** - Permanent loss
- **Prolonged inactivity** - System cleanup after extended periods
- Always maintain minimum bonded balance to prevent deletion

### Economic & Balance Issues

#### Q: Lost all my balance when I died
**A:** This is **intended game mechanics**:
- Death redistributes your entire character balance
- 75% goes to the player/monster that killed you
- 25% contributes to global yield boost
- Only way to preserve wealth is to "ascend" (cash out) before death

#### Q: How do I add more MON to bonded balance?
**A:** To increase bonded balance:
1. Go to character dashboard/profile
2. Find "Add Balance" or "Fund Character" option
3. Specify amount of MON to transfer from wallet to character
4. Confirm transaction and wait for blockchain confirmation

#### Q: Session key ran out of gas
**A:** When session keys run out of funds:
- Character actions will start failing
- You'll see "insufficient session balance" warnings
- Add more MON to session key balance
- Or switch back to wallet-based transactions temporarily

### Technical Problems

#### Q: Game interface not loading or showing errors
**A:** Try these troubleshooting steps:
1. **Hard refresh** - Ctrl+F5 or Cmd+Shift+R
2. **Clear browser storage** - Clear site data and cookies
3. **Check browser console** - F12 → Console tab for error messages
4. **Try incognito/private mode** - Rules out extension conflicts
5. **Different browser** - Chrome, Firefox, Safari compatibility
6. **Check internet connection** - Stable connection required for blockchain interaction

#### Q: Transactions taking too long to confirm
**A:** Blockchain confirmation times vary:
- **Normal** - 2-10 seconds for most transactions
- **Network congestion** - Can take several minutes during high activity
- **Failed transactions** - Check gas limits and try again
- **Stuck transactions** - May need to increase gas price and retry

#### Q: Game data seems out of sync
**A:** Data synchronization issues:
- **Wait 30 seconds** - Game polls blockchain every 500ms
- **Refresh page** - Reloads all data from blockchain
- **Check network status** - Monad network may be experiencing issues
- **Clear cache** - Force reload of all game state

## 🎮 Gameplay Questions

### Q: What's the best class for beginners?
**A:** **Warrior** is most beginner-friendly:
- High health and survivability
- Straightforward combat abilities
- Forgiving stat requirements
- Good balance of offense and defense

### Q: How do I know if I'm fighting enemies at the right level?
**A:** Level matching guidelines:
- **Same level** - Balanced, fair fights
- **1-2 levels lower** - Safe farming for new players
- **1-2 levels higher** - Challenging but doable with good equipment
- **3+ levels higher** - Very dangerous, avoid until experienced

### Q: Should I use session keys?
**A:** **Yes, highly recommended** because:
- **No gas fees** per action (paid upfront)
- **Faster gameplay** - No wallet confirmations
- **Automated actions** - Character can act while you're away
- **Better experience** - Seamless blockchain interaction

### Q: When should I go deeper in the dungeon?
**A:** Depth progression guidelines:
- **Stay at Depth 1-2** until level 10+
- **Gradually explore deeper** as you gain levels and equipment
- **Each depth increases difficulty** but offers better rewards
- **Always have an escape plan** - know how to retreat to surface

## 🔍 Advanced Troubleshooting

### Browser Console Errors
If you see JavaScript errors in browser console:
- Screenshot the error message
- Note what action triggered it
- Try the action in incognito mode
- Report to development team with details

### Network Connectivity
For blockchain connection issues:
- Check Monad network RPC status
- Try switching RPC endpoints if available
- Verify wallet is connected to correct network
- Test with minimal transaction first

### Performance Issues
If game is running slowly:
- Close other browser tabs
- Disable unnecessary browser extensions
- Clear browser cache and restart
- Check if your computer meets system requirements

---

## 📞 Still Need Help?

### Getting Support
1. **Check recent updates** - Game mechanics may have changed
2. **Community Discord** - Other players can help with common issues
3. **GitHub Issues** - Report bugs and technical problems
4. **Developer Documentation** - Technical details for advanced users

### Before Reporting Issues
Include this information:
- **Browser and version** (Chrome 118, Firefox 119, etc.)
- **Wallet type** (MetaMask, WalletConnect, etc.)
- **Character details** (level, class, current location)
- **Error messages** (exact text or screenshots)
- **Steps to reproduce** the problem

### Emergency Contacts
- **Critical bugs** - Use GitHub issues with "urgent" tag
- **Security issues** - Contact development team directly
- **Economic exploits** - Immediate developer notification required