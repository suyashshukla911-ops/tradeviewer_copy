import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { marketDataService } from './data/services/MarketDataService'
import { MarketDataProviderFactory } from './data/providers/MarketDataProviderFactory'
import { MockMarketDataProvider } from './data/providers/MockMarketDataProvider'
import { RealMarketDataProvider } from './data/providers/RealMarketDataProvider'
import { getMarketDataConfig, setMarketDataConfig, resetMarketDataConfig } from './config/marketDataConfig'

if (typeof window !== 'undefined') {
  (window as any).marketDataService = marketDataService;
  (window as any).MarketDataProviderFactory = MarketDataProviderFactory;
  (window as any).MockMarketDataProvider = MockMarketDataProvider;
  (window as any).RealMarketDataProvider = RealMarketDataProvider;
  (window as any).getMarketDataConfig = getMarketDataConfig;
  (window as any).setMarketDataConfig = setMarketDataConfig;
  (window as any).resetMarketDataConfig = resetMarketDataConfig;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
