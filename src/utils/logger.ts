/**
 * Centralized logging utility for Battle Nads
 * Simple console-based logger implementation 
 */

// Define our logger interface
interface LoggerInterface {
  debug: (message: string, meta?: any) => void;
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
}

// Simple logger implementation
const createLogger = (): LoggerInterface => {
  // Get configured log level from environment, defaulting to 'info'
  const configuredLevel = 
    typeof process !== 'undefined' ? 
      (process.env.NEXT_PUBLIC_LOG_LEVEL || 'info') : 
      'info';
  
  // Define log levels and their priorities
  const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  // Convert string level to numeric priority
  const logLevelPriority = levels[configuredLevel as keyof typeof levels] || levels.info;
  
  // Logger implementation
  return {
    debug: (message: string, meta?: any) => {
      if (logLevelPriority <= levels.debug) {
        console.debug(`[debug] ${message}`, meta || '');
      }
    },
    info: (message: string, meta?: any) => {
      if (logLevelPriority <= levels.info) {
        console.info(`[info] ${message}`, meta || '');
      }
    },
    warn: (message: string, meta?: any) => {
      if (logLevelPriority <= levels.warn) {
        console.warn(`[warn] ${message}`, meta || '');
      }
    },
    error: (message: string, meta?: any) => {
      if (logLevelPriority <= levels.error) {
        console.error(`[error] ${message}`, meta || '');
      }
    }
  };
};

// Export the logger singleton
export const logger: LoggerInterface = createLogger();

// Export convenience methods
export const debug = (message: string, meta?: any) => logger.debug(message, meta);
export const info = (message: string, meta?: any) => logger.info(message, meta);
export const warn = (message: string, meta?: any) => logger.warn(message, meta);
export const error = (message: string, meta?: any) => logger.error(message, meta); 