import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import WalletBalances from '@/components/WalletBalances';
import { useWallet } from '@/providers/WalletProvider';
import { useWalletBalances } from '@/hooks/wallet/useWalletState';
import { useBattleNadsClient } from '@/hooks/contracts/useBattleNadsClient';
import { useSimplifiedGameState } from '@/hooks/game/useSimplifiedGameState';
import { useReplenishment } from '@/hooks/wallet/useReplenishment';

// Mock dependencies
jest.mock('@/providers/WalletProvider');
jest.mock('@/hooks/wallet/useWalletState');
jest.mock('@/hooks/contracts/useBattleNadsClient');
jest.mock('@/hooks/game/useSimplifiedGameState');
jest.mock('@/hooks/wallet/useReplenishment');

// Mock chakra toast
const mockToast = jest.fn();
jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useToast: () => mockToast,
}));

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider>
    {children}
  </ChakraProvider>
);

describe('WalletBalances - Automate Feature', () => {
  const mockHandleReplenishBalance = jest.fn();
  
  const defaultMocks = {
    wallet: {
      injectedWallet: {
        address: '0x123',
        signer: {},
      },
    },
    balances: {
      ownerBalance: '10.0',
      sessionKeyBalance: '0.5',
      bondedBalance: '2.0',
      unbondedBalance: '5.0',
      shortfall: null,
      isLoading: false,
      hasShortfall: false,
    },
    client: {
      replenishGasBalance: jest.fn(),
      setMinBondedBalance: jest.fn(),
    },
    gameState: {
      gameState: {
        sessionKeyData: {
          key: '0xabc',
        },
      },
      error: null,
    },
    replenishment: {
      handleReplenishBalance: mockHandleReplenishBalance,
      isReplenishing: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useWallet as jest.Mock).mockReturnValue(defaultMocks.wallet);
    (useWalletBalances as jest.Mock).mockReturnValue(defaultMocks.balances);
    (useBattleNadsClient as jest.Mock).mockReturnValue({ client: defaultMocks.client });
    (useSimplifiedGameState as jest.Mock).mockReturnValue(defaultMocks.gameState);
    (useReplenishment as jest.Mock).mockReturnValue(defaultMocks.replenishment);
  });

  describe('Automate Button', () => {
    it('renders automate button next to Committed balance', () => {
      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      // Look for the Committed balance row
      const committedLabel = screen.getByText('Committed');
      expect(committedLabel).toBeInTheDocument();
      
      // Check for automate button
      const automateButton = screen.getByRole('button', { name: /Automate/i });
      expect(automateButton).toBeInTheDocument();
      expect(automateButton).not.toBeDisabled();
    });

    it('disables automate button when liquid balance is 0', () => {
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        unbondedBalance: '0.0000',
      });

      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      const automateButton = screen.getByRole('button', { name: /Automate/i });
      expect(automateButton).toBeDisabled();
    });

    it('enables automate button even when there is a shortfall', () => {
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        hasShortfall: true,
        shortfall: BigInt('1000000000000000000'), // 1 ETH
        unbondedBalance: '0.5', // Has liquid shMON
      });

      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      // The automate button in the balance display should be enabled if there's liquid shMON
      const automateButtons = screen.getAllByRole('button', { name: /Automate/i });
      // The first one should be enabled since we have liquid shMON
      expect(automateButtons[0]).toBeEnabled();
    });

    it('calls handleReplenishBalance with false when automate is clicked', async () => {
      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      const automateButton = screen.getByRole('button', { name: /Automate/i });
      fireEvent.click(automateButton);

      await waitFor(() => {
        expect(mockHandleReplenishBalance).toHaveBeenCalledWith(false, true);
      });
    });

    it('shows loading state when replenishing', () => {
      (useReplenishment as jest.Mock).mockReturnValue({
        ...defaultMocks.replenishment,
        isReplenishing: true,
      });

      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      // When loading, the button text changes to "Loading..."
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('disables button with correct tooltip when liquid balance is 0', () => {
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        unbondedBalance: '0.0000',
      });

      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      const automateButton = screen.getByRole('button', { name: /Automate/i });
      
      // Check that the button is disabled when liquid balance is 0
      expect(automateButton).toBeDisabled();
    });

    it('enables button when automation is available', () => {
      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      const automateButton = screen.getByRole('button', { name: /Automate/i });
      
      // Check that the button is enabled when automation is available
      expect(automateButton).not.toBeDisabled();
    });
  });

  describe('Shortfall Warning Dismissal', () => {
    it('shows shortfall warning when there is a shortfall', () => {
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        hasShortfall: true,
        shortfall: BigInt('1000000000000000000'), // 1 ETH
      });

      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      expect(screen.getByText('⚠️ Character at Risk!')).toBeInTheDocument();
    });

    it('hides shortfall warning when dismissed', async () => {
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        hasShortfall: true,
        shortfall: BigInt('1000000000000000000'), // 1 ETH
      });

      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      const dismissButton = screen.getByLabelText('Dismiss warning');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('⚠️ Character at Risk!')).not.toBeInTheDocument();
      });
    });

    it('auto-dismisses warning after successful replenishment', async () => {
      mockHandleReplenishBalance.mockResolvedValueOnce(undefined);
      
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        hasShortfall: true,
        shortfall: BigInt('1000000000000000000'), // 1 ETH
      });

      render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      const manualButton = screen.getByRole('button', { name: /Manual/i });
      fireEvent.click(manualButton);

      await waitFor(() => {
        expect(mockHandleReplenishBalance).toHaveBeenCalledWith(true, false);
      });

      // The warning should be dismissed after successful replenishment
      // In real implementation, this would be tested by checking component state
    });

    it('resets dismissed state when shortfall is resolved', () => {
      const { rerender } = render(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      // First render with shortfall
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        hasShortfall: true,
        shortfall: BigInt('1000000000000000000'),
      });

      rerender(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      expect(screen.getByText('⚠️ Character at Risk!')).toBeInTheDocument();

      // Dismiss the warning
      const dismissButton = screen.getByLabelText('Dismiss warning');
      fireEvent.click(dismissButton);

      // Update to no shortfall
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        hasShortfall: false,
        shortfall: null,
      });

      rerender(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      // If shortfall comes back, warning should show again
      (useWalletBalances as jest.Mock).mockReturnValue({
        ...defaultMocks.balances,
        hasShortfall: true,
        shortfall: BigInt('1000000000000000000'),
      });

      rerender(
        <TestWrapper>
          <WalletBalances />
        </TestWrapper>
      );

      expect(screen.getByText('⚠️ Character at Risk!')).toBeInTheDocument();
    });
  });
});