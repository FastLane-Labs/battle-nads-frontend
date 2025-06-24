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
    // Suppress console.error for this test to avoid verbose JSDOM error output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // The hook throws an error, but React catches it and renders error boundaries
    // We need to test the hook directly
    const TestHookComponent = () => {
      useOptimisticUpdatesContext();
      return <div>Should not render</div>;
    };
    
    // Suppress JSDOM error reporting for this specific test
    const originalOnError = window.onerror;
    window.onerror = () => true; // Prevent JSDOM from logging the error
    
    expect(() => {
      render(<TestHookComponent />);
    }).toThrow('useOptimisticUpdatesContext must be used within OptimisticUpdatesProvider');
    
    // Restore original error handling
    window.onerror = originalOnError;
    consoleSpy.mockRestore();
  });
});