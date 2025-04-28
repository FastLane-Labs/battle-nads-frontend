import { logger, debug, info, warn, error } from '../logger';

// Spy on the logger methods directly
jest.spyOn(logger, 'debug');
jest.spyOn(logger, 'info');
jest.spyOn(logger, 'warn');
jest.spyOn(logger, 'error');

// Mock process.env
const originalEnv = process.env;

describe('logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_LOG_LEVEL: 'debug' };
  });

  afterEach(() => {
    process.env = originalEnv;
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
  
  // Skipping the log level test as it's more complex to test with the current approach
  // We would need to re-import the logger with different env settings
}); 