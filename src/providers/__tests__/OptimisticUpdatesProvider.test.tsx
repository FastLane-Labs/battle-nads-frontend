import { render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { OptimisticUpdatesProvider, OptimisticUpdatesContext } from '../OptimisticUpdatesProvider';

const TestComponent = () => {
  const context = useContext(OptimisticUpdatesContext);
  
  if (!context) {
    return <div>No context</div>;
  }
  
  return <div>Context available</div>;
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