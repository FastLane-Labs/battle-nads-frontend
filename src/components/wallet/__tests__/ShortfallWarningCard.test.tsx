import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { ShortfallWarningCard } from '../ShortfallWarningCard';

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider>
    {children}
  </ChakraProvider>
);

describe('ShortfallWarningCard', () => {
  const defaultProps = {
    shortfallAmount: '1.2345',
    isLoading: false,
    disabled: false,
    onManualReplenish: jest.fn(),
    onAutomateReplenish: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders warning message and buttons', () => {
    render(
      <TestWrapper>
        <ShortfallWarningCard {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('⚠️ Character at Risk!')).toBeInTheDocument();
    expect(screen.getByText(/Your committed balance is running low/)).toBeInTheDocument();
    expect(screen.getByText(/If it hits zero, your character won't be able to defend itself/)).toBeInTheDocument();
    
    expect(screen.getByRole('button', { name: /Manual \(1.2345\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Automate \(ShMON\)/i })).toBeInTheDocument();
  });

  it('calls onManualReplenish when manual button is clicked', async () => {
    render(
      <TestWrapper>
        <ShortfallWarningCard {...defaultProps} />
      </TestWrapper>
    );

    const manualButton = screen.getByRole('button', { name: /Manual/i });
    fireEvent.click(manualButton);

    await waitFor(() => {
      expect(defaultProps.onManualReplenish).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onAutomateReplenish when automate button is clicked', async () => {
    render(
      <TestWrapper>
        <ShortfallWarningCard {...defaultProps} />
      </TestWrapper>
    );

    const automateButton = screen.getByRole('button', { name: /Automate/i });
    fireEvent.click(automateButton);

    await waitFor(() => {
      expect(defaultProps.onAutomateReplenish).toHaveBeenCalledTimes(1);
    });
  });

  it('disables buttons when disabled prop is true', () => {
    render(
      <TestWrapper>
        <ShortfallWarningCard {...defaultProps} disabled={true} />
      </TestWrapper>
    );

    const manualButton = screen.getByRole('button', { name: /Manual/i });
    const automateButton = screen.getByRole('button', { name: /Automate/i });

    expect(manualButton).toBeDisabled();
    expect(automateButton).toBeDisabled();
  });

  it('shows loading state on buttons', () => {
    render(
      <TestWrapper>
        <ShortfallWarningCard {...defaultProps} isLoading={true} />
      </TestWrapper>
    );

    const buttons = screen.getAllByRole('button');
    // Filter out the dismiss button if present
    const actionButtons = buttons.filter(btn => btn.textContent?.includes('Replenishing'));
    
    expect(actionButtons).toHaveLength(2);
    actionButtons.forEach(button => {
      expect(button).toHaveAttribute('data-loading');
    });
  });

  describe('Dismiss functionality', () => {
    it('renders dismiss button when onDismiss is provided', () => {
      const onDismiss = jest.fn();
      render(
        <TestWrapper>
          <ShortfallWarningCard {...defaultProps} onDismiss={onDismiss} />
        </TestWrapper>
      );

      const dismissButton = screen.getByLabelText('Dismiss warning');
      expect(dismissButton).toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', async () => {
      const onDismiss = jest.fn();
      render(
        <TestWrapper>
          <ShortfallWarningCard {...defaultProps} onDismiss={onDismiss} />
        </TestWrapper>
      );

      const dismissButton = screen.getByLabelText('Dismiss warning');
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
      });
    });

    it('does not render dismiss button when onDismiss is not provided', () => {
      render(
        <TestWrapper>
          <ShortfallWarningCard {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.queryByLabelText('Dismiss warning')).not.toBeInTheDocument();
    });
  });

  it('applies correct styling classes', () => {
    const { container } = render(
      <TestWrapper>
        <ShortfallWarningCard {...defaultProps} />
      </TestWrapper>
    );

    const card = container.firstChild;
    expect(card).toHaveClass('card-bg');
    expect(card).toHaveClass('!border-red-500/25');
  });
});