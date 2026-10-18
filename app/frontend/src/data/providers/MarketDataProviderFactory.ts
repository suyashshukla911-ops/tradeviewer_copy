import type { MarketDataProvider } from './MarketDataProvider';
import { MockMarketDataProvider } from './MockMarketDataProvider';
import { RealMarketDataProvider } from './RealMarketDataProvider';
import { getMarketDataConfig, type MarketDataConfig } from '../../config/marketDataConfig';

export class MarketDataProviderFactory {
  /**
   * Instantiates the appropriate MarketDataProvider based on configuration.
   * provider === 'mock' -> MockMarketDataProvider
   * provider === 'real' -> RealMarketDataProvider
   */
  public static createProvider(configOverride?: Partial<MarketDataConfig>): MarketDataProvider {
    const config = {
      ...getMarketDataConfig(),
      ...(configOverride || {}),
    };

    if (config.provider === 'real') {
      return new RealMarketDataProvider(config);
    }

    return new MockMarketDataProvider();
  }
}
