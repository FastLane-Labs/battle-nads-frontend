import { render, screen } from '@testing-library/react';
import { OptimisticUpdatesProvider } from '../OptimisticUpdatesProvider';
import { useOptimisticUpdatesContext } from '../OptimisticUpdatesProvider';

const TestComponent = () => {
  try {
    const context = useOptimisticUpdatesContext();
    return <div>Context available</div>;
  } catch {
    return <div>No context</div>;
  }
};

describe('OptimisticUpdatesProvider', () => {
  it('should provide context to children', () => {
    render(
      <OptimisticUpdatesProvider>
        <TestComponent />
      </OptimisticUpdatesProvider>
    );
    
    expect(screen.getByText('Context available')).toBeInTheDocument();
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow();
    
    consoleSpy.mockRestore();
  });
});