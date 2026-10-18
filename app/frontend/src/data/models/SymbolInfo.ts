export type AssetType = 'stock' | 'crypto' | 'forex' | 'index' | 'commodity';

/**
 * Normalized, provider-independent symbol metadata.
 */
export interface SymbolInfo {
  symbol: string;
  name: string;
  exchange: string;
  assetType: AssetType;
  currency: string;
  precision: number;
  timezone: string;
  basePrice?: number;
  // Backward compatibility alias for V1-V5 components
  ticker?: string;
  type?: 'stock' | 'crypto';
  decimals?: number;
}
