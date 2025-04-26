/**
 * Centralized logging utility for Battle Nads
 * Uses winston for structured logging
 */

import winston from 'winston';

// Define custom log levels in order of increasing importance
const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Only create the logger once (singleton pattern)
const createLogger = () => {
  // Development format: simple colored output
  const developmentFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  );

  // Production format: JSON for better parsing
  const productionFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  );

  // Use development format in development, JSON in production
  const format = process.env.NODE_ENV === 'production' 
    ? productionFormat 
    : developmentFormat;

  // Get configured log level from environment, defaulting to 'info'
  const level = process.env.NEXT_PUBLIC_LOG_LEVEL || 'info';

  return winston.createLogger({
    level,
    levels,
    format,
    transports: [
      new winston.transports.Console({
        // Custom format for the Console
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });
};

// Export a singleton instance
export const logger = createLogger();

// Export convenience methods
export const debug = (message: string, meta?: any) => logger.debug(message, meta);
export const info = (message: string, meta?: any) => logger.info(message, meta);
export const warn = (message: string, meta?: any) => logger.warn(message, meta);
export const error = (message: string, meta?: any) => logger.error(message, meta); 