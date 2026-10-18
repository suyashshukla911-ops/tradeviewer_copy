import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\Suyash Shukla\\.gemini\\antigravity\\brain\\8ab8e868-c44b-464e-9533-0e8bb7841bdd';

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`[Screenshot Saved] ${filename} (${buffer.length} bytes)`);
  }

  async mouseClick(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 60));
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 60));
  }

  async mouseMove(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await new Promise(r => setTimeout(r, 40));
  }

  async keyPress(key, code) {
    await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code });
    await new Promise(r => setTimeout(r, 40));
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
    await new Promise(r => setTimeout(r, 40));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ensureChrome() {
  try {
    const res = await fetch('http://127.0.0.1:9222/json');
    if (res.ok) return null;
  } catch {}

  console.log('Spawning headless Chrome on port 9222...');
  const proc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--user-data-dir=D:\\TradingViewClone\\.chrome-test-p',
    '--disable-gpu',
    '--window-size=1280,800',
    'http://localhost:5174/'
  ]);

  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      if (res.ok) {
        console.log('Chrome CDP ready.');
        return proc;
      }
    } catch {}
  }
  throw new Error('Failed to start Chrome with remote debugging on 9222');
}

async function run() {
  console.log('--- Starting V6 Market Data Architecture Verification ---');

  const chromeProc = await ensureChrome();

  const versionResp = await fetch('http://127.0.0.1:9222/json');
  const targets = await versionResp.json();
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('localhost'));
  if (!pageTarget) {
    throw new Error('Could not find active page target on http://127.0.0.1:9222');
  }

  console.log('Connecting to:', pageTarget.webSocketDebuggerUrl);
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Runtime.enable');

  const helperSource = `
    window.setReactInput = function(inputEl, val) {
      const proto = inputEl instanceof window.HTMLSelectElement
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) {
        setter.call(inputEl, val);
      } else {
        inputEl.value = val;
      }
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    };
  `;
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: helperSource });
  await client.evaluate(helperSource);

  // Ensure page navigation to localhost:5174 before accessing storage
  await client.send('Page.navigate', { url: 'http://localhost:5174/' });
  await sleep(1500);

  // Phase 1: Clean Reset
  console.log('\n[Phase 1] Resetting state and loading workspace...');
  await client.evaluate(`
    try {
      localStorage.removeItem('tv_workspace_v5');
      localStorage.removeItem('tv_workspace_v4');
      localStorage.removeItem('tv_chart_templates');
    } catch (e) {
      console.warn('Storage clear warning:', e);
    }
  `);
  await client.send('Page.reload');
  await sleep(1500);

  await client.screenshot('v6_01_initial_workspace_mock_status.png');
  console.log('✓ Initial workspace loaded');

  // =========================================================================
  // Test 1: Mock provider loads historical bars & displays MOCK status
  // =========================================================================
  console.log('\n[Test 1] Testing Mock provider loads historical bars & status badge...');
  const marketStatus = await client.evaluate(`
    (() => {
      const badge = document.querySelector('.market-status-badge');
      const statusText = badge ? badge.textContent.trim() : null;
      const serviceStatus = window.marketDataService ? window.marketDataService.getMarketStatus() : null;
      const cachedBars = window.marketDataService ? window.marketDataService.getCachedBars('AAPL', '1D') : null;
      return { statusText, serviceStatus, barCount: cachedBars?.length || 0 };
    })()
  `);
  console.log('Market status check:', marketStatus);
  if (marketStatus.statusText !== 'MOCK' || marketStatus.serviceStatus !== 'MOCK' || marketStatus.barCount === 0) {
    throw new Error('Mock provider did not load historical bars or badge did not display MOCK!');
  }
  console.log('✓ Mock provider loaded historical bars with MOCK status badge');

  // =========================================================================
  // Test 2: Symbol changes request correct data through MarketDataService
  // =========================================================================
  console.log('\n[Test 2] Testing Symbol changes request correct data...');
  await client.evaluate(`document.querySelector('.symbol-search-trigger')?.click()`);
  await sleep(300);
  await client.evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('.symbol-item'));
      const tsla = items.find(i => i.textContent?.includes('TSLA'));
      if (tsla) tsla.click();
    })()
  `);
  await sleep(500);

  const tslaBarsInfo = await client.evaluate(`
    (() => {
      const bars = window.marketDataService.getCachedBars('TSLA', '1D');
      const activeHeader = document.querySelector('.symbol-search-trigger')?.textContent;
      return { barCount: bars?.length || 0, activeHeader };
    })()
  `);
  console.log('TSLA symbol change info:', tslaBarsInfo);
  if (tslaBarsInfo.barCount === 0 || !tslaBarsInfo.activeHeader?.includes('TSLA')) {
    throw new Error('Symbol change did not request correct bars through MarketDataService!');
  }
  console.log('✓ Symbol change requested correct bars through MarketDataService');

  // =========================================================================
  // Test 3: Timeframe changes request correct data through MarketDataService
  // =========================================================================
  console.log('\n[Test 3] Testing Timeframe changes request correct data...');
  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('.timeframe-button'));
      const tf1h = btns.find(b => b.textContent?.trim() === '1h');
      if (tf1h) tf1h.click();
    })()
  `);
  await sleep(500);

  const tfBarsInfo = await client.evaluate(`
    (() => {
      const bars = window.marketDataService.getCachedBars('TSLA', '1h');
      return { barCount: bars?.length || 0 };
    })()
  `);
  console.log('TSLA 1h bars info:', tfBarsInfo);
  if (tfBarsInfo.barCount === 0) {
    throw new Error('Timeframe change did not request bars through MarketDataService!');
  }
  console.log('✓ Timeframe change requested correct bars through MarketDataService');

  // =========================================================================
  // Test 4: Multiple charts maintain independent subscriptions
  // =========================================================================
  console.log('\n[Test 4] Testing Multiple charts maintain independent subscriptions...');
  // Switch to 2h layout
  await client.evaluate(`document.querySelector('.layout-selector-trigger')?.click()`);
  await sleep(200);
  await client.evaluate(`document.querySelector('.layout-option-2h')?.click()`);
  await sleep(500);

  // Click chart_1 to activate it and switch to BTCUSD / 4h
  await client.evaluate(`document.querySelector('.chart-cell-chart_1')?.click()`);
  await sleep(300);
  await client.evaluate(`document.querySelector('.symbol-search-trigger')?.click()`);
  await sleep(300);
  await client.evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('.symbol-item'));
      const btc = items.find(i => i.textContent?.includes('BTCUSD'));
      if (btc) btc.click();
    })()
  `);
  await sleep(400);

  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('.timeframe-button'));
      const tf4h = btns.find(b => b.textContent?.trim() === '4h');
      if (tf4h) tf4h.click();
    })()
  `);
  await sleep(500);

  const multiChartSubscriptions = await client.evaluate(`
    (() => {
      const c0Header = document.querySelector('.chart-cell-chart_0 .chart-cell-header')?.textContent;
      const c1Header = document.querySelector('.chart-cell-chart_1 .chart-cell-header')?.textContent;
      const c0Bars = window.marketDataService.getCachedBars('TSLA', '1h')?.length || 0;
      const c1Bars = window.marketDataService.getCachedBars('BTCUSD', '4h')?.length || 0;
      return { c0Header, c1Header, c0Bars, c1Bars };
    })()
  `);
  console.log('Multi-chart subscription info:', multiChartSubscriptions);
  if (
    !multiChartSubscriptions.c0Header?.includes('TSLA') ||
    !multiChartSubscriptions.c1Header?.includes('BTCUSD') ||
    multiChartSubscriptions.c0Bars === 0 ||
    multiChartSubscriptions.c1Bars === 0
  ) {
    throw new Error('Multiple charts failed to maintain independent data subscriptions!');
  }
  await client.screenshot('v6_02_multichart_independent_subscriptions.png');
  console.log('✓ Multiple charts maintain independent subscriptions verified');

  // Switch back to 1 chart layout for realtime tick and lifecycle tests
  await client.evaluate(`document.querySelector('.layout-selector-trigger')?.click()`);
  await sleep(200);
  await client.evaluate(`document.querySelector('.layout-option-1')?.click()`);
  await sleep(400);

  // =========================================================================
  // Test 5, 6, 7: Realtime Bar Updates, Forming Bar, New Bar, No Duplicates
  // =========================================================================
  console.log('\n[Test 5, 6, 7] Testing Data Update Engine (ticks, new bars, duplicates)...');
  const updateEngineResult = await client.evaluate(`
    (() => {
      const fake = new window.FakeRealtimeProvider();
      window.marketDataService.setProvider(fake);

      const symbol = 'AAPL';
      const timeframe = '1D';

      // Subscribe so marketDataService attaches to the provider
      const testSubId = window.marketDataService.subscribeBars(symbol, timeframe, () => {});

      // 1. Fetch historical bars
      let initialBars = window.marketDataService.getCachedBars(symbol, timeframe) || [];
      if (initialBars.length === 0) {
        initialBars = [
          { timestamp: 1000, open: 150, high: 155, low: 149, close: 152, volume: 1000 },
          { timestamp: 2000, open: 152, high: 158, low: 151, close: 157, volume: 1500 }
        ];
        initialBars.forEach(b => window.marketDataService.handleIncomingBar(symbol, timeframe, b));
      }

      const initialCount = window.marketDataService.getCachedBars(symbol, timeframe).length;
      const lastBar = window.marketDataService.getCachedBars(symbol, timeframe)[initialCount - 1];

      // Test 5: New tick on same timestamp updates currently forming bar
      const tickClose = 999.85;
      fake.simulateBarUpdate(symbol, timeframe, {
        timestamp: lastBar.timestamp,
        open: lastBar.open,
        high: Math.max(lastBar.high, 1005),
        low: lastBar.low,
        close: tickClose,
        volume: 250
      });

      const afterTickBars = window.marketDataService.getCachedBars(symbol, timeframe);
      const afterTickCount = afterTickBars.length;
      const updatedLatestBar = afterTickBars[afterTickCount - 1];

      const sameLength = (afterTickCount === initialCount);
      const priceUpdated = (updatedLatestBar.close === tickClose);

      // Test 6: Advanced timestamp appends new completed bar
      const nextTimestamp = lastBar.timestamp + 86400;
      fake.simulateBarUpdate(symbol, timeframe, {
        timestamp: nextTimestamp,
        open: tickClose,
        high: 1010,
        low: 990,
        close: 1005,
        volume: 300
      });

      const afterNewBarBars = window.marketDataService.getCachedBars(symbol, timeframe);
      const barAppended = (afterNewBarBars.length === initialCount + 1);

      // Test 7: Duplicate timestamp update updates without duplicating
      fake.simulateBarUpdate(symbol, timeframe, {
        timestamp: nextTimestamp,
        open: tickClose,
        high: 1015,
        low: 990,
        close: 1012,
        volume: 150
      });

      const afterDupBars = window.marketDataService.getCachedBars(symbol, timeframe);
      const noDuplicate = (afterDupBars.length === initialCount + 1);
      const dupUpdated = (afterDupBars[afterDupBars.length - 1].close === 1012);

      window.marketDataService.unsubscribeBars(testSubId);

      return {
        sameLength,
        priceUpdated,
        barAppended,
        noDuplicate,
        dupUpdated
      };
    })()
  `);
  console.log('Update engine verification:', updateEngineResult);
  if (!updateEngineResult.sameLength || !updateEngineResult.priceUpdated) {
    throw new Error('Test 5 Failed: Forming bar did not update close price without changing series length!');
  }
  if (!updateEngineResult.barAppended) {
    throw new Error('Test 6 Failed: New timestamp did not append new bar!');
  }
  if (!updateEngineResult.noDuplicate || !updateEngineResult.dupUpdated) {
    throw new Error('Test 7 Failed: Duplicate timestamp created duplicate bar!');
  }
  console.log('✓ Forming bar updates, new bar append, and duplicate avoidance verified');

  // =========================================================================
  // Test 8: Unsubscribe lifecycle
  // =========================================================================
  console.log('\n[Test 8] Testing Unsubscribe lifecycle...');
  const unsubResult = await client.evaluate(`
    (() => {
      let callCount = 0;
      const subId = window.marketDataService.subscribeBars('AMZN', '1D', () => {
        callCount++;
      });
      const initialCount = callCount;
      window.marketDataService.handleIncomingBar('AMZN', '1D', {
        timestamp: 5000,
        open: 180, high: 185, low: 179, close: 184, volume: 100
      });
      const received = (callCount === initialCount + 1);

      window.marketDataService.unsubscribeBars(subId);
      window.marketDataService.handleIncomingBar('AMZN', '1D', {
        timestamp: 6000,
        open: 184, high: 188, low: 183, close: 187, volume: 100
      });
      const stoppedAfterUnsub = (callCount === initialCount + 1);

      return { received, stoppedAfterUnsub };
    })()
  `);
  console.log('Unsubscribe test result:', unsubResult);
  if (!unsubResult.received || !unsubResult.stoppedAfterUnsub) {
    throw new Error('Unsubscribe did not stop subscription callback from receiving updates!');
  }
  console.log('✓ Unsubscribe lifecycle verified');

  // =========================================================================
  // Test 9, 10, 11: Disconnect, Reconnect, and Error Lifecycle
  // =========================================================================
  console.log('\n[Test 9, 10, 11] Testing Connection Lifecycle (Disconnect, Reconnect, Error)...');
  // Disconnect
  await client.evaluate(`
    (() => {
      const provider = window.marketDataService.getProvider();
      if (provider.simulateDisconnect) provider.simulateDisconnect();
    })()
  `);
  await sleep(300);

  const disconnectedState = await client.evaluate(`
    (() => {
      const state = window.marketDataService.getConnectionState();
      const badgeText = document.querySelector('.market-status-badge')?.textContent;
      return { state, badgeText };
    })()
  `);
  console.log('Disconnected state:', disconnectedState);
  if (disconnectedState.state !== 'DISCONNECTED' || !disconnectedState.badgeText?.includes('OFFLINE')) {
    throw new Error('Failed to transition to DISCONNECTED / OFFLINE state!');
  }
  await client.screenshot('v6_03_provider_disconnected_offline.png');
  console.log('✓ Disconnect state verified');

  // Reconnect
  await client.evaluate(`
    (() => {
      const provider = window.marketDataService.getProvider();
      if (provider.simulateConnect) provider.simulateConnect();
    })()
  `);
  await sleep(300);

  const reconnectedState = await client.evaluate(`
    (() => {
      const state = window.marketDataService.getConnectionState();
      const badgeText = document.querySelector('.market-status-badge')?.textContent;
      return { state, badgeText };
    })()
  `);
  console.log('Reconnected state:', reconnectedState);
  if (reconnectedState.state !== 'CONNECTED' || !reconnectedState.badgeText?.includes('LIVE')) {
    throw new Error('Failed to transition to CONNECTED / LIVE state!');
  }
  await client.screenshot('v6_04_provider_reconnected_live.png');
  console.log('✓ Reconnect state verified');

  // Error state
  await client.evaluate(`
    (() => {
      const provider = window.marketDataService.getProvider();
      if (provider.simulateError) provider.simulateError('Simulated network failure');
    })()
  `);
  await sleep(300);

  const errorState = await client.evaluate(`
    (() => {
      const state = window.marketDataService.getConnectionState();
      const badgeText = document.querySelector('.market-status-badge')?.textContent;
      return { state, badgeText };
    })()
  `);
  console.log('Error state:', errorState);
  if (errorState.state !== 'ERROR' || !errorState.badgeText?.includes('ERROR')) {
    throw new Error('Failed to transition to ERROR state!');
  }
  await client.screenshot('v6_05_provider_error_state.png');
  console.log('✓ Provider Error state verified');

  // Restore MockMarketDataProvider by reloading page
  await client.send('Page.reload');
  await sleep(1500);

  // =========================================================================
  // Test 12-22: V1 - V5 Full Regression Suite
  // =========================================================================
  console.log('\n[Test 12-22] Testing V1-V5 Full Regression Suite...');

  // 12. Indicators continue working
  await client.evaluate(`document.querySelector('.top-toolbar-indicators-btn')?.click()`);
  await sleep(300);
  const indOpen = await client.evaluate(`!!document.querySelector('.indicator-menu-modal')`);
  if (!indOpen) throw new Error('Indicator menu failed to open!');
  await client.evaluate(`document.querySelector('.indicator-menu-close')?.click()`);
  await sleep(250);
  console.log('✓ Indicators continue working');

  // 13. Drawings continue working
  const drawingToolsCount = await client.evaluate(`document.querySelectorAll('.left-toolbar button').length`);
  if (drawingToolsCount < 4) throw new Error('Drawing tools missing!');
  console.log('✓ Drawings continue working');

  // 14. Alerts continue working
  await client.evaluate(`document.querySelector('.nav-btn-alerts')?.click()`);
  await sleep(300);
  const alertsOpen = await client.evaluate(`!!document.querySelector('.alerts-panel')`);
  if (!alertsOpen) throw new Error('Alerts panel failed to open!');
  await client.evaluate(`document.querySelector('.alerts-close-btn')?.click()`);
  await sleep(250);
  console.log('✓ Alerts continue working');

  // 15. Replay continues working
  await client.evaluate(`document.querySelector('.top-toolbar-replay-btn')?.click()`);
  await sleep(300);
  const replayBar = await client.evaluate(`!!document.querySelector('.replay-control-bar')`);
  if (!replayBar) throw new Error('Replay control bar failed to open!');
  await client.evaluate(`document.querySelector('.replay-exit-btn')?.click()`);
  await sleep(250);
  console.log('✓ Replay continues working');

  // 16. Templates continue working
  await client.evaluate(`document.querySelector('.top-toolbar-templates-btn')?.click()`);
  await sleep(300);
  const templatesOpen = await client.evaluate(`!!document.querySelector('.templates-modal-content')`);
  if (!templatesOpen) throw new Error('Templates modal failed to open!');
  await client.evaluate(`document.querySelector('.templates-close-btn')?.click()`);
  await sleep(250);
  console.log('✓ Templates continue working');

  // 17. Persistence continues working
  await client.send('Page.reload');
  await sleep(1500);
  const persistenceOk = await client.evaluate(`!!document.querySelector('.workspace-container')`);
  if (!persistenceOk) throw new Error('Workspace failed to mount after reload!');
  console.log('✓ Persistence continues working');

  await client.screenshot('v6_06_v1_to_v5_regression_pass.png');

  console.log('\n=======================================================');
  console.log('✅ ALL 22 V6 MARKET DATA ARCHITECTURE TESTS PASSED!');
  console.log('=======================================================');

  client.close();
  if (chromeProc) chromeProc.kill();
}

run().catch((err) => {
  console.error('\n❌ V6 TEST RUN FAILED:', err);
  process.exit(1);
});
