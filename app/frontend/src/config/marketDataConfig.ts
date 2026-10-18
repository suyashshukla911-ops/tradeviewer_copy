export type MarketDataProviderType = 'mock' | 'real';

export interface MarketDataConfig {
  provider: MarketDataProviderType;
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryCount: number;
}

export const DEFAULT_MARKET_DATA_CONFIG: MarketDataConfig = {
  provider: 'mock',
  baseUrl: '',
  apiKey: '',
  timeout: 10000,
  retryCount: 3,
};

function readEnvConfig(): MarketDataConfig {
  const proc = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
  const env: Record<string, any> =
    typeof import.meta !== 'undefined' && (import.meta as any).env
      ? (import.meta as any).env
      : proc && proc.env
      ? proc.env
      : {};

  const rawProvider = env.VITE_MARKET_DATA_PROVIDER || env.MARKET_DATA_PROVIDER;
  const provider: MarketDataProviderType =
    rawProvider === 'real' ? 'real' : 'mock';

  const baseUrl = env.VITE_MARKET_DATA_API_BASE_URL || env.MARKET_DATA_API_BASE_URL || '';
  const apiKey = env.VITE_MARKET_DATA_API_KEY || env.MARKET_DATA_API_KEY || '';
  const timeout = Number(env.VITE_MARKET_DATA_TIMEOUT || env.MARKET_DATA_TIMEOUT) || 10000;
  const retryCount = Number(env.VITE_MARKET_DATA_RETRY_COUNT || env.MARKET_DATA_RETRY_COUNT) || 3;

  return {
    provider,
    baseUrl,
    apiKey,
    timeout,
    retryCount,
  };
}

let activeConfig: MarketDataConfig = readEnvConfig();

/**
 * Returns current configuration.
 */
export function getMarketDataConfig(): MarketDataConfig {
  return { ...activeConfig };
}

/**
 * Programmatically updates market data configuration.
 */
export function setMarketDataConfig(updates: Partial<MarketDataConfig>): MarketDataConfig {
  activeConfig = {
    ...activeConfig,
    ...updates,
  };
  return { ...activeConfig };
}

/**
 * Resets configuration back to environment-based defaults.
 */
export function resetMarketDataConfig(): MarketDataConfig {
  activeConfig = readEnvConfig();
  return { ...activeConfig };
}
