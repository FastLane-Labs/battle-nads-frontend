import { WebSocketProvider, JsonRpcProvider } from 'ethers';
import { RPC_URLS, CHAIN_ID } from '../config/env';

export interface ProviderConfig {
  reconnectAttempts?: number;
  reconnectDelay?: number;
  fallbackToHttp?: boolean;
}

const DEFAULT_CONFIG: Required<ProviderConfig> = {
  reconnectAttempts: 3,
  reconnectDelay: 1000,
  fallbackToHttp: true,
};

export class WebSocketProviderManager {
  private wsProvider: WebSocketProvider | null = null;
  private httpProvider: JsonRpcProvider | null = null;
  private config: Required<ProviderConfig>;
  private reconnectCount = 0;
  private isConnecting = false;

  constructor(config: ProviderConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async getProvider(): Promise<WebSocketProvider | JsonRpcProvider> {
    if (this.wsProvider && !this.wsProvider.destroyed) {
      return this.wsProvider;
    }

    if (this.isConnecting) {
      await this.waitForConnection();
      return this.getProvider();
    }

    return this.createProvider();
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
      // Create provider with manual network specification to avoid eth_chainId call
      const provider = new WebSocketProvider(wsUrl, {
        chainId: CHAIN_ID,
        name: 'monad-testnet'
      });
      
      // Set up event handlers
      this.setupWebSocketHandlers(provider);
      
      return provider;
      
    } catch (error) {
      console.error('WebSocket connection failed:', (error as Error).message);
      throw error;
    }
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

export const createWebSocketProvider = (config?: ProviderConfig): WebSocketProviderManager => {
  return new WebSocketProviderManager(config);
};