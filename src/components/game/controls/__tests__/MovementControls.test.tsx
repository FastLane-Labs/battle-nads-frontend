import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider, Tooltip } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MovementControls from '../MovementControls';

// Mock the useTransactionBalance hook
jest.mock('@/hooks/game/useTransactionBalance', () => ({
  useTransactionBalance: () => ({
    isTransactionDisabled: false,
    insufficientBalanceMessage: null,
  }),
}));

// Helper to render with ChakraProvider and QueryClientProvider
const renderWithProvider = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>{component}</ChakraProvider>
    </QueryClientProvider>
  );
};

describe('MovementControls Component', () => {
  const mockOnMove = jest.fn();
  const mockPosition = { x: 10, y: 20, z: 5 };

  beforeEach(() => {
    mockOnMove.mockClear();
  });

  it('renders all movement buttons', () => {
    renderWithProvider(
      <MovementControls 
        onMove={mockOnMove} 
        isMoving={false} 
        position={mockPosition} 
      />
    );
    expect(screen.getByRole('button', { name: /move north/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move south/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move east/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move west/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move down/i })).toBeInTheDocument();
  });

  it('calls onMove with correct direction when a button is clicked', () => {
    renderWithProvider(
      <MovementControls 
        onMove={mockOnMove} 
        isMoving={false} 
        position={mockPosition} 
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /move north/i }));
    expect(mockOnMove).toHaveBeenCalledWith('north');

    fireEvent.click(screen.getByRole('button', { name: /move east/i }));
    expect(mockOnMove).toHaveBeenCalledWith('east');
    // ... add clicks for other directions if needed ...
  });

  it('disables buttons when isMoving=true', async () => {
    renderWithProvider(
      <MovementControls 
        onMove={mockOnMove} 
        isMoving={true} 
        position={mockPosition} 
      />
    );
    const northButton = screen.getByRole('button', { name: /move north/i });
    expect(northButton).toBeDisabled();
  });

  it('enables buttons when isMoving=false', async () => {
    renderWithProvider(
      <MovementControls 
        onMove={mockOnMove} 
        isMoving={false} 
        position={mockPosition} 
      />
    );
    const northButton = screen.getByRole('button', { name: /move north/i });
    expect(northButton).toBeEnabled();
  });

  it('disables buttons when at spawn location (z=0)', async () => {
    const spawnPosition = { x: 0, y: 0, z: 0 };
    renderWithProvider(
      <MovementControls 
        onMove={mockOnMove} 
        isMoving={false} 
        position={spawnPosition} 
      />
    );
    const northButton = screen.getByRole('button', { name: /move north/i });
    expect(northButton).toBeDisabled();
  });

  it('enables buttons when not at spawn location', async () => {
    renderWithProvider(
      <MovementControls 
        onMove={mockOnMove} 
        isMoving={false} 
        position={mockPosition} 
      />
    );
    const northButton = screen.getByRole('button', { name: /move north/i });
    expect(northButton).toBeEnabled();
  });

}); 