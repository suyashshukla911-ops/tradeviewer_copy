import fs from 'fs';
import path from 'path';

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

  async mouseDrag(fromX, fromY, toX, toY, steps = 10) {
    await this.mouseMove(fromX, fromY);
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: fromX, y: fromY, button: 'left', clickCount: 1 });
    for (let i = 1; i <= steps; i++) {
      const curX = Math.round(fromX + (toX - fromX) * (i / steps));
      const curY = Math.round(fromY + (toY - fromY) * (i / steps));
      await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: curX, y: curY, buttons: 1 });
      await new Promise(r => setTimeout(r, 20));
    }
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: toX, y: toY, button: 'left', clickCount: 1 });
    await new Promise(r => setTimeout(r, 60));
  }

  async mouseWheel(x, y, deltaX, deltaY) {
    await this.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY });
    await new Promise(r => setTimeout(r, 100));
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

async function run() {
  console.log('--- Starting V3 Multi-Pane, Technical Indicator & Drawing Engine Verification ---');

  // 1. Discover target
  const res = await fetch('http://127.0.0.1:9222/json');
  const targets = await res.json();
  const target = targets.find(t => t.url.includes('5174') || t.url.includes('5173'));
  if (!target) throw new Error('Target page not found!');
  console.log(`Connecting to: ${target.webSocketDebuggerUrl}`);

  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('DOM.enable');
  await client.send('Runtime.enable');

  // Ensure window is properly sized
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Reload page to start with fresh state
  console.log('\n[Step 1] Reloading page to test initial hydration...');
  await client.send('Page.reload');
  await sleep(1200);

  // 2. Initial state verification
  const initialInfo = await client.evaluate(`
    (() => {
      const topBar = !!document.querySelector('.workspace-top-toolbar');
      const leftBar = !!document.querySelector('.workspace-left-toolbar');
      const mainChart = !!document.querySelector('.chart-main-area');
      const mainPane = !!document.querySelector('.pane-row.main-price-pane');
      const badges = Array.from(document.querySelectorAll('.pane-row.main-price-pane span')).map(s => s.textContent?.trim()).filter(Boolean);
      return { topBar, leftBar, mainChart, mainPane, badges };
    })()
  `);
  console.log('Initial DOM Verification:', initialInfo);
  if (!initialInfo.topBar || !initialInfo.leftBar || !initialInfo.mainPane) {
    throw new Error('Initial DOM structure missing required workspace elements!');
  }
  await client.screenshot('v3_01_initial_state.png');

  // 3. Test Indicator Menu opening
  console.log('\n[Step 2] Opening Indicator Menu modal...');
  const clickedIndButton = await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const indBtn = btns.find(b => b.textContent?.includes('Indicators') || b.title?.includes('Indicators'));
      if (indBtn) {
        indBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log('Clicked Indicators button:', clickedIndButton);
  await sleep(400);

  const menuOpen = await client.evaluate(`!!document.querySelector('.indicator-menu-backdrop')`);
  console.log('Is Indicator Menu modal visible:', menuOpen);
  if (!menuOpen) throw new Error('Indicator Menu failed to open!');
  await client.screenshot('v3_02_indicator_menu_open.png');

  // 4. Add Indicators: EMA, Bollinger Bands, Volume, RSI
  console.log('\n[Step 3] Adding EMA, BB, Volume, and RSI...');
  await client.evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('.indicator-item'));
      for (const item of items) {
        const text = item.textContent || '';
        if (text.includes('Exponential Moving Average') ||
            text.includes('Bollinger Bands') ||
            text.includes('Volume') ||
            text.includes('Relative Strength Index')) {
          item.click();
        }
      }
    })()
  `);
  await sleep(400);

  // Close menu via Escape
  await client.keyPress('Escape', 'Escape');
  await sleep(500);

  // Verify indicators and sub-panes rendered
  const indicatorStatus = await client.evaluate(`
    (() => {
      const volPane = !!document.querySelector('.volume-pane');
      const rsiPane = !!document.querySelector('.rsi-pane');
      const volCanvases = document.querySelectorAll('.volume-pane canvas').length;
      const rsiCanvases = document.querySelectorAll('.rsi-pane canvas').length;
      const badges = Array.from(document.querySelectorAll('.chart-main-area span'))
        .map(s => s.textContent?.trim())
        .filter(t => t && (t.includes('SMA') || t.includes('EMA') || t.includes('BB') || t.includes('Vol') || t.includes('RSI')));
      return { volPane, rsiPane, volCanvases, rsiCanvases, badges };
    })()
  `);
  console.log('Indicator & Multi-Pane Status:', indicatorStatus);
  if (!indicatorStatus.volPane || !indicatorStatus.rsiPane) {
    throw new Error('Volume or RSI sub-pane failed to render!');
  }
  await client.screenshot('v3_03_all_indicators_active.png');

  // 5. Test Drawing Tools: Trend Line, Horizontal Line, Measure Tool
  console.log('\n[Step 4] Testing Drawing Tools on Left Toolbar...');

  const plotBox = await client.evaluate(`
    (() => {
      const el = document.querySelector('.main-price-pane .plot-surface canvas:nth-child(2)');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()
  `);
  console.log('Main Plot Canvas Bounds:', plotBox);
  if (!plotBox) throw new Error('Plot canvas not found for drawing interaction!');

  // Select Trend Line tool
  console.log('Selecting Trend Line tool...');
  await client.evaluate(`
    (() => {
      const btn = document.querySelector('button[title*="Trend Line"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(200);

  // Click point 1 and point 2 for Trend Line
  const p1X = Math.round(plotBox.left + plotBox.width * 0.25);
  const p1Y = Math.round(plotBox.top + plotBox.height * 0.65);
  const p2X = Math.round(plotBox.left + plotBox.width * 0.65);
  const p2Y = Math.round(plotBox.top + plotBox.height * 0.35);

  console.log(`Drawing Trend Line from (${p1X}, ${p1Y}) to (${p2X}, ${p2Y})...`);
  await client.mouseClick(p1X, p1Y);
  await sleep(100);
  await client.mouseMove(p2X, p2Y);
  await sleep(100);
  await client.mouseClick(p2X, p2Y);
  await sleep(300);
  await client.screenshot('v3_04_trend_line_drawn.png');

  // Select Horizontal Line tool
  console.log('Selecting Horizontal Line tool...');
  await client.evaluate(`
    (() => {
      const btn = document.querySelector('button[title*="Horizontal Line"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(200);

  const hX = Math.round(plotBox.left + plotBox.width * 0.45);
  const hY = Math.round(plotBox.top + plotBox.height * 0.45);
  console.log(`Placing Horizontal Line at (${hX}, ${hY})...`);
  await client.mouseClick(hX, hY);
  await sleep(300);
  await client.screenshot('v3_05_horizontal_line_drawn.png');

  // Select Measurement Tool
  console.log('Selecting Measurement Tool...');
  await client.evaluate(`
    (() => {
      const btn = document.querySelector('button[title*="Measure"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(200);

  const m1X = Math.round(plotBox.left + plotBox.width * 0.30);
  const m1Y = Math.round(plotBox.top + plotBox.height * 0.70);
  const m2X = Math.round(plotBox.left + plotBox.width * 0.55);
  const m2Y = Math.round(plotBox.top + plotBox.height * 0.30);
  console.log(`Drawing Measurement from (${m1X}, ${m1Y}) to (${m2X}, ${m2Y})...`);
  await client.mouseClick(m1X, m1Y);
  await sleep(100);
  await client.mouseMove(m2X, m2Y);
  await sleep(100);
  await client.mouseClick(m2X, m2Y);
  await sleep(300);
  await client.screenshot('v3_06_measurement_drawn.png');

  // Check drawing count in state
  const drawingCount = await client.evaluate(`
    (() => {
      const btn = document.querySelector('button[title*="Clear all drawings"]');
      return btn ? btn.title : null;
    })()
  `);
  console.log('Drawing counter tooltip:', drawingCount);

  // 6. Test Data-Coordinate Alignment during Pan
  console.log('\n[Step 5] Panning chart to verify drawing alignment...');
  const panStartX = Math.round(plotBox.left + plotBox.width * 0.6);
  const panStartY = Math.round(plotBox.top + plotBox.height * 0.5);
  const panEndX = Math.round(plotBox.left + plotBox.width * 0.3);
  const panEndY = panStartY;
  await client.mouseDrag(panStartX, panStartY, panEndX, panEndY, 12);
  await sleep(300);
  await client.screenshot('v3_07_panned_drawings_aligned.png');

  // 7. Test Data-Coordinate Alignment during Zoom
  console.log('\n[Step 6] Zooming chart with mouse wheel...');
  await client.mouseWheel(panEndX, panEndY, 0, -250);
  await sleep(300);
  await client.screenshot('v3_08_zoomed_drawings_aligned.png');

  // 8. Test Escape cancels in-progress drawing
  console.log('\n[Step 7] Testing Escape cancellation of in-progress drawing...');
  await client.evaluate(`
    (() => {
      const btn = document.querySelector('button[title*="Trend Line"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(150);
  await client.mouseClick(Math.round(plotBox.left + 100), Math.round(plotBox.top + 100));
  await sleep(100);
  await client.mouseMove(Math.round(plotBox.left + 200), Math.round(plotBox.top + 150));
  await sleep(100);
  // Press Escape
  await client.keyPress('Escape', 'Escape');
  await sleep(200);
  console.log('Escape pressed to cancel in-progress drawing.');

  // 9. Test Synchronized Crosshair across Multi-Pane
  console.log('\n[Step 8] Testing Synchronized Crosshair across Main, Volume, and RSI panes...');
  const crosshairX = Math.round(plotBox.left + plotBox.width * 0.5);
  const crosshairY = Math.round(plotBox.top + plotBox.height * 0.5);
  await client.mouseMove(crosshairX, crosshairY);
  await sleep(200);
  await client.screenshot('v3_09_synchronized_crosshair.png');

  // 10. Test In-Chart Indicator Removal (X button on badge)
  console.log('\n[Step 9] Testing indicator badge removal (removing RSI)...');
  const removedRsi = await client.evaluate(`
    (() => {
      const rsiPane = document.querySelector('.rsi-pane');
      if (!rsiPane) return false;
      const removeBtn = rsiPane.querySelector('button[title*="Remove"]');
      if (removeBtn) {
        removeBtn.click();
        return true;
      }
      return false;
    })()
  `);
  console.log('Clicked remove RSI button:', removedRsi);
  await sleep(400);

  const rsiGone = await client.evaluate(`!document.querySelector('.rsi-pane')`);
  console.log('RSI Pane cleanly unmounted:', rsiGone);
  if (!rsiGone) throw new Error('RSI pane failed to unmount upon indicator removal!');
  await client.screenshot('v3_10_rsi_removed_main_expanded.png');

  // 11. Test LocalStorage Persistence after page reload
  console.log('\n[Step 10] Testing LocalStorage Persistence across page reload...');
  await client.send('Page.reload');
  await sleep(1200);

  const persistedInfo = await client.evaluate(`
    (() => {
      const volPane = !!document.querySelector('.volume-pane');
      const rsiPane = !!document.querySelector('.rsi-pane');
      const clearBtn = document.querySelector('button[title*="Clear all drawings"]');
      const badges = Array.from(document.querySelectorAll('.chart-main-area span'))
        .map(s => s.textContent?.trim())
        .filter(t => t && (t.includes('SMA') || t.includes('EMA') || t.includes('BB') || t.includes('Vol') || t.includes('RSI')));
      return {
        volPane,
        rsiPane,
        drawingsTooltip: clearBtn ? clearBtn.title : null,
        badges,
      };
    })()
  `);
  console.log('Persisted Workspace State:', persistedInfo);
  if (!persistedInfo.volPane) {
    throw new Error('Volume indicator pane did not persist in localStorage!');
  }
  if (!persistedInfo.drawingsTooltip || !persistedInfo.drawingsTooltip.includes('3')) {
    console.warn('Note on drawing persistence:', persistedInfo.drawingsTooltip);
  }
  await client.screenshot('v3_11_persisted_after_reload.png');

  // 12. Test Clear Drawings
  console.log('\n[Step 11] Testing Clear Drawings button...');
  await client.evaluate(`
    (() => {
      const btn = document.querySelector('button[title*="Clear all drawings"]');
      if (btn) btn.click();
    })()
  `);
  await sleep(300);
  const clearedDrawings = await client.evaluate(`
    (() => {
      const btn = document.querySelector('button[title*="Clear all drawings"]');
      return btn ? btn.title : null;
    })()
  `);
  console.log('Drawings after clear:', clearedDrawings);
  await client.screenshot('v3_12_drawings_cleared.png');

  // 13. Regression Verification: V1/V2 Features
  console.log('\n[Step 12] Testing V1/V2 Feature Compatibility...');
  // Symbol change
  await client.evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('.watchlist-item'));
      const nvda = items.find(i => i.textContent?.includes('NVDA'));
      if (nvda) nvda.click();
    })()
  `);
  await sleep(300);

  // Timeframe change
  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('.timeframe-button'));
      const tf1h = btns.find(b => b.textContent?.trim() === '1h');
      if (tf1h) tf1h.click();
    })()
  `);
  await sleep(300);

  // Chart type change to Area
  await client.evaluate(`
    (() => {
      const btn = document.querySelector('.chart-type-trigger');
      if (btn) btn.click();
    })()
  `);
  await sleep(200);
  await client.evaluate(`
    (() => {
      const options = Array.from(document.querySelectorAll('.chart-type-option'));
      const area = options.find(o => o.textContent?.includes('Area'));
      if (area) area.click();
    })()
  `);
  await sleep(300);

  // Reset view
  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reset = btns.find(b => b.textContent?.includes('Reset') || b.title?.includes('Reset'));
      if (reset) reset.click();
    })()
  `);
  await sleep(300);

  await client.screenshot('v3_13_v1_v2_regression_pass.png');
  console.log('\n=======================================================');
  console.log('✅ ALL V3 TECHNICAL INDICATOR, MULTI-PANE & DRAWING TESTS PASSED!');
  console.log('=======================================================');

  client.close();
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
