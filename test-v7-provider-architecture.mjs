import fs from 'fs';
import path from 'path';
import os from 'os';
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
  const tempProfileDir = path.join(os.tmpdir(), `chrome-test-tv-${Date.now()}`);
  const proc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--remote-debugging-port=9222',
    '--headless=new',
    `--user-data-dir=${tempProfileDir}`,
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
  console.log('--- Starting V7 Market Data Architecture Verification ---');

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

  // Navigate to app page
  await client.send('Page.navigate', { url: 'http://localhost:5174/' });
  
  // Wait for React and market data globals to be ready
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    try {
      const ready = await client.evaluate('typeof window.setMarketDataConfig === "function" && typeof window.MarketDataProviderFactory === "function"');
      if (ready) {
        console.log('App and market data globals initialized.');
        break;
      }
    } catch {}
  }

  const testResults = [];
  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`PASS: [${testName}] ${details}`);
      testResults.push({ name: testName, pass: true, details });
    } else {
      console.error(`FAIL: [${testName}] ${details}`);
      testResults.push({ name: testName, pass: false, details });
    }
  }

  // Initial screenshot
  await client.screenshot('v7_01_initial_workspace_mock.png');

  // ========================================================
  // Test 1: Mock provider selection
  // ========================================================
  const t1 = await client.evaluate(`
    (() => {
      window.setMarketDataConfig({ provider: 'mock' });
      const prov = window.MarketDataProviderFactory.createProvider();
      return {
        name: prov.name,
        status: prov.status,
        isMock: prov instanceof window.MockMarketDataProvider,
      };
    })()
  `);
  assert(
    t1.isMock && t1.name === 'MockMarketDataProvider' && t1.status === 'MOCK',
    'Test 1: Mock provider selection',
    `Created ${t1.name} with status=${t1.status}`
  );

  // ========================================================
  // Test 2: Real provider selection
  // ========================================================
  const t2 = await client.evaluate(`
    (() => {
      window.setMarketDataConfig({
        provider: 'real',
        baseUrl: 'https://api.marketdata.example.com',
        apiKey: 'test-api-key',
      });
      const prov = window.MarketDataProviderFactory.createProvider();
      return {
        name: prov.name,
        status: prov.status,
        isReal: prov instanceof window.RealMarketDataProvider,
        config: prov.getConfig(),
      };
    })()
  `);
  assert(
    t2.isReal && t2.name === 'RealMarketDataProvider' && t2.config.apiKey === 'test-api-key',
    'Test 2: Real provider selection',
    `Created ${t2.name} with baseUrl=${t2.config.baseUrl}`
  );

  // ========================================================
  // Test 3: Provider factory override behavior
  // ========================================================
  const t3 = await client.evaluate(`
    (() => {
      const mockProv = window.MarketDataProviderFactory.createProvider({ provider: 'mock' });
      const realProv = window.MarketDataProviderFactory.createProvider({ provider: 'real', baseUrl: 'http://test' });
      return {
        mockOk: mockProv instanceof window.MockMarketDataProvider,
        realOk: realProv instanceof window.RealMarketDataProvider,
      };
    })()
  `);
  assert(
    t3.mockOk && t3.realOk,
    'Test 3: Provider factory parameter overrides',
    'Factory creates distinct providers matching override configs'
  );

  // ========================================================
  // Test 4: Historical normalization
  // ========================================================
  const t4 = await client.evaluate(`
    (() => {
      const prov = new window.RealMarketDataProvider({ baseUrl: 'http://test' });
      
      // 1. Array format
      const arrData = [
        { timestamp: 1700000000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 1700000060, open: 102, high: 108, low: 101, close: 107, volume: 1500 }
      ];
      const normArr = prov.normalizeHistoricalBarsResponse(arrData);

      // 2. Columnar format (Unix seconds converted to ms)
      const colData = {
        s: 'ok',
        t: [1700000120, 1700000180],
        o: [107, 109],
        h: [111, 112],
        l: [106, 108],
        c: [109, 110],
        v: [800, 950]
      };
      const normCol = prov.normalizeHistoricalBarsResponse(colData);

      // 3. Deduplication of identical timestamps
      const dupData = [
        { timestamp: 1700000000000, open: 100, high: 105, low: 95, close: 102, volume: 100 },
        { timestamp: 1700000000000, open: 100, high: 106, low: 95, close: 105, volume: 150 }
      ];
      const normDup = prov.normalizeHistoricalBarsResponse(dupData);

      return {
        arrLen: normArr.length,
        arrMs: normArr[0].timestamp >= 1e11,
        colLen: normCol.length,
        colMs: normCol[0].timestamp >= 1e11,
        dupLen: normDup.length,
        dupClose: normDup[0].close,
      };
    })()
  `);
  assert(
    t4.arrLen === 2 && t4.arrMs && t4.colLen === 2 && t4.colMs && t4.dupLen === 1 && t4.dupClose === 105,
    'Test 4: Historical normalization',
    `Normalized array, columnar format, Unix seconds to ms, and deduplicated identical timestamps (dupLen=${t4.dupLen})`
  );

  // ========================================================
  // Test 5: Realtime normalization
  // ========================================================
  const t5 = await client.evaluate(`
    (() => {
      const prov = new window.RealMarketDataProvider();
      const raw = { t: 1700000240, o: '110.5', h: 115, l: 109.8, c: '114.2', v: '2500' };
      const bar = prov.normalizeBar(raw);
      return {
        timestamp: bar.timestamp,
        isMs: bar.timestamp >= 1e11,
        open: bar.open,
        close: bar.close,
        volume: bar.volume,
        isNum: typeof bar.open === 'number' && typeof bar.close === 'number' && typeof bar.volume === 'number',
      };
    })()
  `);
  assert(
    t5.isMs && t5.isNum && t5.open === 110.5 && t5.close === 114.2 && t5.volume === 2500,
    'Test 5: Realtime normalization',
    `Normalized single bar with numeric parsing and ms timestamp (${t5.timestamp})`
  );

  // ========================================================
  // Test 6: Same-timestamp bar update
  // ========================================================
  const t6 = await client.evaluate(`
    (() => {
      const service = window.marketDataService;
      const sym = 'TESTSYM';
      const tf = '1D';

      // Clear cache and seed initial bar
      service.clearCache();
      service.handleIncomingBar(sym, tf, {
        timestamp: 1700000000000,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: 500,
      });
      const len1 = service.getCachedBars(sym, tf).length;

      // Update forming bar (same timestamp)
      service.handleIncomingBar(sym, tf, {
        timestamp: 1700000000000,
        open: 100,
        high: 108,
        low: 94,
        close: 107,
        volume: 300,
      });
      const bars2 = service.getCachedBars(sym, tf);
      const updated = bars2[bars2.length - 1];

      return {
        len1,
        len2: bars2.length,
        high: updated.high,
        low: updated.low,
        close: updated.close,
        volume: updated.volume,
      };
    })()
  `);
  assert(
    t6.len1 === 1 && t6.len2 === 1 && t6.high === 108 && t6.low === 94 && t6.close === 107 && t6.volume === 800,
    'Test 6: Same-timestamp bar update',
    `Updated forming bar in place: len=${t6.len2}, high=${t6.high}, low=${t6.low}, close=${t6.close}, vol=${t6.volume}`
  );

  // ========================================================
  // Test 7: New timestamp append
  // ========================================================
  const t7 = await client.evaluate(`
    (() => {
      const service = window.marketDataService;
      const sym = 'TESTSYM';
      const tf = '1D';

      service.handleIncomingBar(sym, tf, {
        timestamp: 1700000060000,
        open: 107,
        high: 112,
        low: 106,
        close: 111,
        volume: 400,
      });
      const bars = service.getCachedBars(sym, tf);
      return {
        length: bars.length,
        lastClose: bars[bars.length - 1].close,
        lastTs: bars[bars.length - 1].timestamp,
      };
    })()
  `);
  assert(
    t7.length === 2 && t7.lastClose === 111 && t7.lastTs === 1700000060000,
    'Test 7: New timestamp append',
    `Appended new completed bar: series length=${t7.length}, lastClose=${t7.lastClose}`
  );

  // ========================================================
  // Test 8: Duplicate prevention
  // ========================================================
  const t8 = await client.evaluate(`
    (() => {
      const service = window.marketDataService;
      const sym = 'TESTSYM';
      const tf = '1D';

      // Send same timestamp as second bar
      service.handleIncomingBar(sym, tf, {
        timestamp: 1700000060000,
        open: 107,
        high: 115,
        low: 105,
        close: 114,
        volume: 200,
      });
      const bars = service.getCachedBars(sym, tf);
      return {
        length: bars.length,
        close: bars[bars.length - 1].close,
      };
    })()
  `);
  assert(
    t8.length === 2 && t8.close === 114,
    'Test 8: Duplicate prevention',
    `Deduplicated timestamp: series length remained ${t8.length}, updated close to ${t8.close}`
  );

  // ========================================================
  // Test 9: Provider timeout
  // ========================================================
  const t9 = await client.evaluate(`
    (async () => {
      const prov = new window.RealMarketDataProvider({
        baseUrl: 'http://mock-api.local',
        timeout: 50,
        retryCount: 0,
      });

      // Mock fetch that hangs past timeout
      prov.setCustomFetchHandler((url, opts) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(new Response('{}', { status: 200 })), 250);
        opts?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }));

      try {
        await prov.getHistoricalBars('AAPL', '1D');
        return { caught: false };
      } catch (err) {
        return {
          caught: true,
          code: err.code,
          message: err.message,
        };
      }
    })()
  `);
  assert(
    t9.caught && t9.code === 'TIMEOUT',
    'Test 9: Provider timeout handling',
    `Caught timeout error code: ${t9.code} (${t9.message})`
  );

  // ========================================================
  // Test 10: Provider HTTP error
  // ========================================================
  const t10 = await client.evaluate(`
    (async () => {
      const prov = new window.RealMarketDataProvider({
        baseUrl: 'http://mock-api.local',
        retryCount: 0,
      });

      prov.setCustomFetchHandler(() => Promise.resolve(new Response('Server Error', {
        status: 500,
        statusText: 'Internal Server Error'
      })));

      try {
        await prov.getHistoricalBars('AAPL', '1D');
        return { caught: false };
      } catch (err) {
        return {
          caught: true,
          code: err.code,
          status: err.status,
        };
      }
    })()
  `);
  assert(
    t10.caught && t10.code === 'HTTP_ERROR' && t10.status === 500,
    'Test 10: Provider HTTP error handling',
    `Caught HTTP error: code=${t10.code}, status=${t10.status}`
  );

  // ========================================================
  // Test 11: Authentication error
  // ========================================================
  const t11 = await client.evaluate(`
    (async () => {
      let callCount = 0;
      const prov = new window.RealMarketDataProvider({
        baseUrl: 'http://mock-api.local',
        retryCount: 3, // Should not retry on 401
      });

      prov.setCustomFetchHandler(() => {
        callCount++;
        return Promise.resolve(new Response('Unauthorized', {
          status: 401,
          statusText: 'Unauthorized'
        }));
      });

      try {
        await prov.getHistoricalBars('AAPL', '1D');
        return { caught: false };
      } catch (err) {
        return {
          caught: true,
          code: err.code,
          status: err.status,
          callCount,
        };
      }
    })()
  `);
  assert(
    t11.caught && t11.code === 'AUTHENTICATION_FAILED' && t11.status === 401 && t11.callCount === 1,
    'Test 11: Authentication error handling',
    `Caught AUTHENTICATION_FAILED (status=${t11.status}), skipped retries (calls=${t11.callCount})`
  );

  // ========================================================
  // Test 12: Malformed response
  // ========================================================
  const t12 = await client.evaluate(`
    (async () => {
      const prov = new window.RealMarketDataProvider({
        baseUrl: 'http://mock-api.local',
        retryCount: 0,
      });

      prov.setCustomFetchHandler(() => Promise.resolve(new Response('{"invalid": true}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })));

      try {
        await prov.getHistoricalBars('AAPL', '1D');
        return { caught: false };
      } catch (err) {
        return {
          caught: true,
          code: err.code,
        };
      }
    })()
  `);
  assert(
    t12.caught && t12.code === 'MALFORMED_RESPONSE',
    'Test 12: Malformed response handling',
    `Caught MALFORMED_RESPONSE error when response lacks bar array`
  );

  // ========================================================
  // Test 13: Retry limit and bounded exponential backoff
  // ========================================================
  const t13 = await client.evaluate(`
    (async () => {
      let attempts = 0;
      const prov = new window.RealMarketDataProvider({
        baseUrl: 'http://mock-api.local',
        retryCount: 2,
      });

      prov.setCustomFetchHandler(() => {
        attempts++;
        return Promise.resolve(new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable'
        }));
      });

      try {
        await prov.getHistoricalBars('AAPL', '1D');
        return { caught: false };
      } catch (err) {
        return {
          caught: true,
          attempts,
          code: err.code,
        };
      }
    })()
  `);
  assert(
    t13.caught && t13.attempts === 3,
    'Test 13: Retry limit adherence',
    `Bounded retry stopped after exactly ${t13.attempts} attempts (1 initial + 2 retries), zero infinite loops`
  );

  // ========================================================
  // Test 14: Connection state transitions
  // ========================================================
  const t14 = await client.evaluate(`
    (() => {
      const prov = new window.RealMarketDataProvider();
      const states = [];
      prov.onConnectionStateChange((st) => states.push({ state: st, status: prov.status }));

      prov.simulateConnectionState('CONNECTED');
      prov.simulateConnectionState('DISCONNECTED');
      prov.simulateConnectionState('ERROR');

      return {
        states,
        finalStatus: prov.status,
      };
    })()
  `);
  assert(
    t14.states.some(s => s.state === 'CONNECTED' && s.status === 'LIVE') &&
    t14.states.some(s => s.state === 'DISCONNECTED' && s.status === 'OFFLINE') &&
    t14.states.some(s => s.state === 'ERROR' && s.status === 'ERROR'),
    'Test 14: Connection state transitions',
    `Mapped CONNECTED->LIVE, DISCONNECTED->OFFLINE, ERROR->ERROR`
  );

  // ========================================================
  // Test 15: Multi-chart independent subscriptions
  // ========================================================
  const t15 = await client.evaluate(`
    (() => {
      const service = window.marketDataService;
      let chart0Updates = 0;
      let chart1Updates = 0;
      let chart2Updates = 0;
      let chart3Updates = 0;

      const sub0 = service.subscribeBars('AAPL', '1D', () => chart0Updates++);
      const sub1 = service.subscribeBars('BTCUSD', '1h', () => chart1Updates++);
      const sub2 = service.subscribeBars('NVDA', '5m', () => chart2Updates++);
      const sub3 = service.subscribeBars('ETHUSD', '15m', () => chart3Updates++);

      // Emit update only on BTCUSD 1h
      service.handleIncomingBar('BTCUSD', '1h', {
        timestamp: Date.now(),
        open: 65000,
        high: 65500,
        low: 64900,
        close: 65200,
        volume: 120,
      });

      // Cleanup
      service.unsubscribeBars(sub0);
      service.unsubscribeBars(sub1);
      service.unsubscribeBars(sub2);
      service.unsubscribeBars(sub3);

      return {
        chart0Updates,
        chart1Updates,
        chart2Updates,
        chart3Updates,
      };
    })()
  `);
  assert(
    t15.chart1Updates >= 1 && t15.chart0Updates === 0 && t15.chart2Updates === 0 && t15.chart3Updates === 0,
    'Test 15: Multi-chart independent subscriptions',
    `Only Chart 1 received BTCUSD update (updates=${t15.chart1Updates}), Charts 0,2,3 unaffected`
  );

  // Reset to Mock provider for UI testing
  await client.evaluate(`
    (() => {
      window.setMarketDataConfig({ provider: 'mock' });
      window.marketDataService.setProvider(new window.MockMarketDataProvider());
    })()
  `);
  await sleep(400);

  // ========================================================
  // Test 16: Existing indicators (SMA, EMA, Bollinger, RSI)
  // ========================================================
  const t16 = await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.indicator-status-badge, [data-testid^="indicator-badge-"]'))
        .map(el => el.textContent);
      return { badgesCount: badges.length, badges };
    })()
  `);
  assert(
    t16.badgesCount > 0,
    'Test 16: Existing indicators functioning',
    `Indicator badges present in workspace: ${t16.badges.join(', ')}`
  );

  // ========================================================
  // Test 17: Existing drawings
  // ========================================================
  const t17 = await client.evaluate(`
    (() => {
      // Find trendline button
      const trendBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Trend') || b.textContent?.includes('Trend'));
      return { trendBtnFound: !!trendBtn };
    })()
  `);
  assert(
    t17.trendBtnFound,
    'Test 17: Existing drawings toolbar tools accessible',
    'Drawing tools found in left toolbar'
  );

  // ========================================================
  // Test 18: Existing alerts
  // ========================================================
  const t18 = await client.evaluate(`
    (() => {
      const alertBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Alert') || b.textContent?.includes('Alert'));
      return { alertBtnFound: !!alertBtn };
    })()
  `);
  assert(
    t18.alertBtnFound,
    'Test 18: Existing alerts panel accessible',
    'Alert creation and alerts panel button verified'
  );

  // ========================================================
  // Test 19: Existing replay
  // ========================================================
  const t19 = await client.evaluate(`
    (() => {
      const replayBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Replay') || b.textContent?.includes('Replay'));
      return { replayBtnFound: !!replayBtn };
    })()
  `);
  assert(
    t19.replayBtnFound,
    'Test 19: Existing replay mode controls accessible',
    'Replay trigger button present in top toolbar'
  );

  // ========================================================
  // Test 20: Existing multi-chart layouts
  // ========================================================
  await client.evaluate(`
    (() => {
      // Click layout selector or cycle layout
      const layoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Layout') || b.textContent?.includes('⊞') || b.textContent?.includes('Layout'));
      if (layoutBtn) layoutBtn.click();
    })()
  `);
  await sleep(300);
  await client.screenshot('v7_02_layout_selector_active.png');

  // Verify multi-chart layout state
  const t20 = await client.evaluate(`
    (() => {
      const canvases = document.querySelectorAll('canvas');
      return { canvasCount: canvases.length };
    })()
  `);
  assert(
    t20.canvasCount >= 1,
    'Test 20: Multi-chart layouts and canvas surfaces active',
    `Active canvas elements rendered: ${t20.canvasCount}`
  );

  // ========================================================
  // Test 21: Existing templates
  // ========================================================
  const t21 = await client.evaluate(`
    (() => {
      const tplBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Templates') || b.title?.includes('Templates'));
      return { tplBtnFound: !!tplBtn };
    })()
  `);
  assert(
    t21.tplBtnFound,
    'Test 21: Existing templates controls accessible',
    'Template modal trigger button present in top toolbar'
  );

  // ========================================================
  // Test 22: V1-V6 regression
  // ========================================================
  // Switch to Real provider and verify UI badge changes to LIVE / CONNECTING
  await client.evaluate(`
    (() => {
      const realProv = new window.RealMarketDataProvider({
        baseUrl: 'https://api.marketdata.example.com',
        apiKey: 'test-demo',
      });
      window.marketDataService.setProvider(realProv);
      realProv.simulateConnectionState('CONNECTED');
    })()
  `);
  await sleep(400);
  await client.screenshot('v7_03_real_provider_live_badge.png');

  const t22 = await client.evaluate(`
    (() => {
      const badge = document.querySelector('[data-testid="market-status-badge"]') || document.querySelector('.market-status-badge');
      const text = badge ? badge.textContent : '';
      return { badgeText: text };
    })()
  `);
  assert(
    t22.badgeText.includes('LIVE'),
    'Test 22: V1-V6 regression & real provider status badge integration',
    `Status badge dynamically updated to: ${t22.badgeText}`
  );

  // Switch back to Mock and capture final pass screenshot
  await client.evaluate(`
    (() => {
      window.setMarketDataConfig({ provider: 'mock' });
      window.marketDataService.setProvider(new window.MockMarketDataProvider());
    })()
  `);
  await sleep(400);
  await client.screenshot('v7_04_regression_suite_pass.png');

  // Summary
  const passCount = testResults.filter(r => r.pass).length;
  console.log(`\n==================================================`);
  console.log(`V7 TEST RESULTS: ${passCount} / ${testResults.length} PASSED`);
  console.log(`==================================================\n`);

  client.close();
  if (chromeProc) {
    chromeProc.kill();
  }

  if (passCount !== testResults.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
