export interface SymbolInfo {
  ticker: string;
  name: string;
  exchange: string;
  type: 'stock' | 'crypto';
  basePrice: number;
  decimals: number;
}

export const SYMBOL_CATALOG: SymbolInfo[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    exchange: 'NASDAQ',
    type: 'stock',
    basePrice: 343.46,
    decimals: 2,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    type: 'stock',
    basePrice: 428.15,
    decimals: 2,
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    type: 'stock',
    basePrice: 182.30,
    decimals: 2,
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    exchange: 'NASDAQ',
    type: 'stock',
    basePrice: 186.40,
    decimals: 2,
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    exchange: 'NASDAQ',
    type: 'stock',
    basePrice: 221.75,
    decimals: 2,
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    type: 'stock',
    basePrice: 138.90,
    decimals: 2,
  },
  {
    ticker: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    exchange: 'CRYPTO',
    type: 'crypto',
    basePrice: 68450.00,
    decimals: 2,
  },
  {
    ticker: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    exchange: 'CRYPTO',
    type: 'crypto',
    basePrice: 3520.00,
    decimals: 2,
  },
];

export function getSymbolInfo(ticker: string): SymbolInfo {
  const found = SYMBOL_CATALOG.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
  return (
    found || {
      ticker,
      name: ticker,
      exchange: 'UNKNOWN',
      type: 'stock',
      basePrice: 100.0,
      decimals: 2,
    }
  );
}
