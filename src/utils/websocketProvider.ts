import { WebSocketProvider, JsonRpcProvider } from 'ethers';
import { RPC_URLS, CHAIN_ID } from '../config/env';

export interface ProviderConfig {
  reconnectAttempts?: number;
  reconnectDelay?: number;
  fallbackToHttp?: boolean;
}

const DEFAULT_CONFIG: Required<ProviderConfig> = {
  reconnectAttempts: 2, // Reduce attempts to avoid overwhelming endpoint
  reconnectDelay: 2000, // Increase delay between attempts
  fallbackToHttp: true,
};

export class WebSocketProviderManager {
  private wsProvider: WebSocketProvider | null = null;
  private httpProvider: JsonRpcProvider | null = null;
  private config: Required<ProviderConfig>;
  private reconnectCount = 0;
  private isConnecting = false;
  private connectionPromise: Promise<WebSocketProvider | JsonRpcProvider> | null = null;

  constructor(config: ProviderConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async getProvider(): Promise<WebSocketProvider | JsonRpcProvider> {
    // Return existing provider if available
    if (this.wsProvider && !this.wsProvider.destroyed) {
      return this.wsProvider;
    }

    // If already connecting, wait for that connection
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create new connection
    this.connectionPromise = this.createProvider();
    
    try {
      const provider = await this.connectionPromise;
      return provider;
    } finally {
      this.connectionPromise = null;
    }
  }

  async getProviderForReads(): Promise<JsonRpcProvider> {
    // For read operations, prefer HTTP to avoid WebSocket method limitations
    return this.createHttpProvider();
  }

  private async createProvider(): Promise<WebSocketProvider | JsonRpcProvider> {
    this.isConnecting = true;

    try {
      const wsProvider = await this.createWebSocketProvider();
      this.wsProvider = wsProvider;
      this.reconnectCount = 0;
      this.isConnecting = false;
      return wsProvider;
    } catch (error) {
      console.warn('WebSocket connection failed, attempting fallback:', error);
      this.isConnecting = false;
      
      if (this.config.fallbackToHttp) {
        return this.createHttpProvider();
      }
      
      throw error;
    }
  }

  private async createWebSocketProvider(): Promise<WebSocketProvider> {
    const wsUrl = RPC_URLS.PRIMARY_WS;
    
    try {
      // Create provider with manual network specification and connection options
      const provider = new WebSocketProvider(wsUrl, {
        chainId: CHAIN_ID,
        name: 'monad-testnet'
      });
      
      // Set up event handlers
      this.setupWebSocketHandlers(provider);
      
      // Test the connection before returning
      await this.testConnection(provider);
      
      return provider;
      
    } catch (error) {
      console.error('WebSocket connection failed:', (error as Error).message);
      throw error;
    }
  }

  private async testConnection(provider: WebSocketProvider): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection test timeout'));
      }, 5000);

      // Test with a simple network call
      provider.getNetwork().then(() => {
        clearTimeout(timeout);
        resolve();
      }).catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private createHttpProvider(): JsonRpcProvider {
    if (!this.httpProvider) {
      this.httpProvider = new JsonRpcProvider(RPC_URLS.PRIMARY_HTTP);
    }
    return this.httpProvider;
  }

  private setupWebSocketHandlers(provider: WebSocketProvider): void {
    // Set up event handlers for connection monitoring
    provider.on('error', (error) => {
      console.error('WebSocket provider error:', error);
      this.handleReconnect();
    });

    // Monitor network changes that might affect WebSocket connections
    provider.on('network', (newNetwork, oldNetwork) => {
      if (oldNetwork && newNetwork?.chainId !== oldNetwork?.chainId) {
        console.warn('Network changed, reconnecting WebSocket...');
        this.handleReconnect();
      }
    });
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectCount >= this.config.reconnectAttempts) {
      console.error('Max reconnection attempts reached, falling back to HTTP');
      this.wsProvider = null;
      return;
    }

    this.reconnectCount++;
    
    setTimeout(async () => {
      try {
        await this.createProvider();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, this.config.reconnectDelay * this.reconnectCount);
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (!this.isConnecting) {
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };
      checkConnection();
    });
  }

  destroy(): void {
    if (this.wsProvider) {
      try {
        this.wsProvider.destroy();
      } catch (error) {
        // Ignore cleanup errors in test environments
      }
      this.wsProvider = null;
    }
    this.httpProvider = null;
  }
}

// Global singleton to prevent multiple WebSocket connections
let globalWebSocketManager: WebSocketProviderManager | null = null;

export const createWebSocketProvider = (config?: ProviderConfig): WebSocketProviderManager => {
  if (!globalWebSocketManager) {
    globalWebSocketManager = new WebSocketProviderManager(config);
  }
  return globalWebSocketManager;
};