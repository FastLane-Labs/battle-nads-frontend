import { logger, debug, info, warn, error } from '../logger';

// Mock winston transports
jest.mock('winston', () => {
  const mockFormat = {
    colorize: jest.fn().mockReturnThis(),
    timestamp: jest.fn().mockReturnThis(),
    printf: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    combine: jest.fn().mockReturnThis(),
    simple: jest.fn().mockReturnThis(),
  };
  
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  
  return {
    format: mockFormat,
    createLogger: jest.fn().mockReturnValue(mockLogger),
    transports: {
      Console: jest.fn(),
    },
  };
});

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should provide a logger instance', () => {
    expect(logger).toBeDefined();
  });
  
  it('should provide debug method', () => {
    const message = 'Debug message';
    const meta = { key: 'value' };
    
    debug(message, meta);
    
    expect(logger.debug).toHaveBeenCalledWith(message, meta);
  });
  
  it('should provide info method', () => {
    const message = 'Info message';
    const meta = { key: 'value' };
    
    info(message, meta);
    
    expect(logger.info).toHaveBeenCalledWith(message, meta);
  });
  
  it('should provide warn method', () => {
    const message = 'Warning message';
    const meta = { key: 'value' };
    
    warn(message, meta);
    
    expect(logger.warn).toHaveBeenCalledWith(message, meta);
  });
  
  it('should provide error method', () => {
    const message = 'Error message';
    const meta = { key: 'value' };
    
    error(message, meta);
    
    expect(logger.error).toHaveBeenCalledWith(message, meta);
  });
}); 