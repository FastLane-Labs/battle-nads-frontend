import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { BalanceDisplay } from '../BalanceDisplay';

// Wrapper component for tests
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider>
    {children}
  </ChakraProvider>
);

describe('BalanceDisplay', () => {
  const defaultProps = {
    label: 'Test Balance',
    balance: '100.5000',
    tokenType: 'MON' as const,
  };

  it('renders balance information correctly', () => {
    render(
      <TestWrapper>
        <BalanceDisplay {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Balance')).toBeInTheDocument();
    expect(screen.getByText('MON')).toBeInTheDocument();
    expect(screen.getByText('100.5000')).toBeInTheDocument();
  });

  it('formats balance with specified precision', () => {
    render(
      <TestWrapper>
        <BalanceDisplay {...defaultProps} precision={2} />
      </TestWrapper>
    );

    expect(screen.getByText('100.50')).toBeInTheDocument();
  });

  it('renders action link when provided', () => {
    const actionLink = {
      label: 'Get More',
      url: 'https://example.com',
    };

    render(
      <TestWrapper>
        <BalanceDisplay {...defaultProps} actionLink={actionLink} />
      </TestWrapper>
    );

    const link = screen.getByText('Get More');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com');
    expect(link.closest('a')).toHaveAttribute('target', '_blank');
    expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  describe('Action Button', () => {
    it('renders action button when provided', () => {
      const mockOnClick = jest.fn();
      const actionButton = {
        label: 'Automate',
        onClick: mockOnClick,
        icon: '⚙️',
        tooltip: 'Test tooltip',
      };

      render(
        <TestWrapper>
          <BalanceDisplay {...defaultProps} actionButton={actionButton} />
      </TestWrapper>
      );

      expect(screen.getByText('Automate')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('handles button click', async () => {
      const mockOnClick = jest.fn();
      const actionButton = {
        label: 'Automate',
        onClick: mockOnClick,
      };

      render(
        <TestWrapper>
          <BalanceDisplay {...defaultProps} actionButton={actionButton} />
      </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /Automate/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockOnClick).toHaveBeenCalledTimes(1);
      });
    });

    it('disables button when disabled prop is true', () => {
      const actionButton = {
        label: 'Automate',
        onClick: jest.fn(),
        disabled: true,
        tooltip: 'Button is disabled',
      };

      render(
        <TestWrapper>
          <BalanceDisplay {...defaultProps} actionButton={actionButton} />
      </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /Automate/i });
      expect(button).toBeDisabled();
    });

    it('shows loading state', () => {
      const actionButton = {
        label: 'Automate',
        onClick: jest.fn(),
        isLoading: true,
      };

      render(
        <TestWrapper>
          <BalanceDisplay {...defaultProps} actionButton={actionButton} />
      </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-loading');
    });

    it('renders different token type badges correctly', () => {
      render(
        <TestWrapper>
          <BalanceDisplay {...defaultProps} tokenType="shMON" />
      </TestWrapper>
      );

      expect(screen.getByText('shMON')).toBeInTheDocument();
    });

    it('applies correct styling for disabled button', () => {
      const actionButton = {
        label: 'Automate',
        onClick: jest.fn(),
        disabled: true,
      };

      render(
        <TestWrapper>
          <BalanceDisplay {...defaultProps} actionButton={actionButton} />
      </TestWrapper>
      );

      const button = screen.getByRole('button', { name: /Automate/i });
      expect(button.className).toContain('cursor-not-allowed');
      expect(button.className).toContain('opacity-60');
    });
  });
});