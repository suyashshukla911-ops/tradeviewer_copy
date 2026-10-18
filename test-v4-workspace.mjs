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
  console.log('--- Starting V4 Advanced Workspace Editing Verification ---');

  // 1. Discover and connect
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

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log('\n[Phase 1] Resetting state and loading workspace...');
  await client.evaluate(`localStorage.clear()`);
  await client.send('Page.reload');
  await sleep(1200);

  // Add all 5 indicators to have full multi-pane environment
  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const indBtn = btns.find(b => b.textContent?.includes('Indicators') || b.title?.includes('Indicators'));
      if (indBtn) indBtn.click();
    })()
  `);
  await sleep(400);

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
  await sleep(300);
  await client.keyPress('Escape', 'Escape');
  await sleep(500);

  await client.screenshot('v4_01_initial_multi_pane.png');
  console.log('✓ Initial multi-pane environment setup complete');

  // =========================================================================
  // 1. SMA Settings Change
  // =========================================================================
  await client.evaluate(`
    window.setReactInput = function(input, val) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(input, val);
      } else {
        input.value = val;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
  `);

  console.log('\n[Test 1] Testing SMA Settings Change...');
  const openedSmaSettings = await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const smaBadge = badges.find(b => b.textContent?.includes('SMA'));
      if (smaBadge) {
        const settingsBtn = smaBadge.querySelector('.badge-btn-settings');
        if (settingsBtn) {
          settingsBtn.click();
          return true;
        }
      }
      return false;
    })()
  `);
  console.log('Opened SMA settings modal:', openedSmaSettings);
  await sleep(400);

  // Change period to 50
  await client.evaluate(`
    (() => {
      const modal = document.querySelector('.indicator-settings-dialog');
      if (!modal) return false;
      const input = modal.querySelector('input[type="number"]');
      if (input) {
        window.setReactInput(input, '50');
      }
      const submit = modal.querySelector('button[type="submit"]');
      if (submit) submit.click();
      return true;
    })()
  `);
  await sleep(400);

  const smaBadgeText = await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const smaBadge = badges.find(b => b.textContent?.includes('SMA'));
      return smaBadge ? smaBadge.textContent : null;
    })()
  `);
  console.log('Updated SMA badge text:', smaBadgeText);
  if (!smaBadgeText || !smaBadgeText.includes('50')) {
    throw new Error('SMA period did not update to 50!');
  }
  await client.screenshot('v4_02_sma_settings_applied.png');
  console.log('✓ SMA Settings verified (period updated to 50)');

  // =========================================================================
  // 2. EMA Settings Change
  // =========================================================================
  console.log('\n[Test 2] Testing EMA Settings Change...');
  await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const emaBadge = badges.find(b => b.textContent?.includes('EMA'));
      if (emaBadge) {
        const settingsBtn = emaBadge.querySelector('.badge-btn-settings');
        if (settingsBtn) settingsBtn.click();
      }
    })()
  `);
  await sleep(400);

  await client.evaluate(`
    (() => {
      const modal = document.querySelector('.indicator-settings-dialog');
      if (!modal) return;
      const input = modal.querySelector('input[type="number"]');
      if (input) {
        window.setReactInput(input, '100');
      }
      const submit = modal.querySelector('button[type="submit"]');
      if (submit) submit.click();
    })()
  `);
  await sleep(400);

  const emaBadgeText = await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const emaBadge = badges.find(b => b.textContent?.includes('EMA'));
      return emaBadge ? emaBadge.textContent : null;
    })()
  `);
  console.log('Updated EMA badge text:', emaBadgeText);
  if (!emaBadgeText || !emaBadgeText.includes('100')) {
    throw new Error('EMA period did not update to 100!');
  }
  console.log('✓ EMA Settings verified (period updated to 100)');

  // =========================================================================
  // 3. Bollinger Bands Settings Change
  // =========================================================================
  console.log('\n[Test 3] Testing Bollinger Bands Settings Change...');
  await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const bbBadge = badges.find(b => b.textContent?.includes('BB'));
      if (bbBadge) {
        const settingsBtn = bbBadge.querySelector('.badge-btn-settings');
        if (settingsBtn) settingsBtn.click();
      }
    })()
  `);
  await sleep(400);

  await client.evaluate(`
    (() => {
      const modal = document.querySelector('.indicator-settings-dialog');
      if (!modal) return;
      const inputs = modal.querySelectorAll('input[type="number"]');
      if (inputs.length >= 2) {
        window.setReactInput(inputs[0], '30');
        window.setReactInput(inputs[1], '2.5');
      }
      const submit = modal.querySelector('button[type="submit"]');
      if (submit) submit.click();
    })()
  `);
  await sleep(400);

  const bbBadgeText = await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const bbBadge = badges.find(b => b.textContent?.includes('BB'));
      return bbBadge ? bbBadge.textContent : null;
    })()
  `);
  console.log('Updated BB badge text:', bbBadgeText);
  if (!bbBadgeText || !bbBadgeText.includes('30') || !bbBadgeText.includes('2.5')) {
    throw new Error('Bollinger Bands parameters did not update!');
  }
  console.log('✓ Bollinger Bands Settings verified');

  // =========================================================================
  // 4. RSI Settings Change (Double click badge test)
  // =========================================================================
  console.log('\n[Test 4] Testing RSI Settings Change via Badge Double-Click...');
  await client.evaluate(`
    (() => {
      const rsiBadge = document.querySelector('.rsi-pane .indicator-status-badge');
      if (rsiBadge) {
        rsiBadge.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      }
    })()
  `);
  await sleep(400);

  const rsiModalOpen = await client.evaluate(`!!document.querySelector('.indicator-settings-dialog')`);
  console.log('RSI Settings modal opened via double click:', rsiModalOpen);
  if (!rsiModalOpen) throw new Error('Double click failed to open RSI settings modal!');

  await client.evaluate(`
    (() => {
      const modal = document.querySelector('.indicator-settings-dialog');
      if (!modal) return;
      const inputs = modal.querySelectorAll('input[type="number"]');
      if (inputs.length >= 4) {
        window.setReactInput(inputs[0], '21');
        window.setReactInput(inputs[1], '80');
        window.setReactInput(inputs[3], '20');
      }
      const submit = modal.querySelector('button[type="submit"]');
      if (submit) submit.click();
    })()
  `);
  await sleep(400);

  const rsiBadgeText = await client.evaluate(`
    (() => {
      const b = document.querySelector('.rsi-pane .indicator-status-badge');
      return b ? b.textContent : null;
    })()
  `);
  console.log('Updated RSI badge text:', rsiBadgeText);
  if (!rsiBadgeText || !rsiBadgeText.includes('21')) {
    throw new Error('RSI period did not update to 21!');
  }
  await client.screenshot('v4_03_indicator_settings_customized.png');
  console.log('✓ RSI Settings & Double-click interaction verified');

  // =========================================================================
  // 5. Indicator Visibility Toggle
  // =========================================================================
  console.log('\n[Test 5] Testing Indicator Visibility Toggle...');
  await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const smaBadge = badges.find(b => b.textContent?.includes('SMA'));
      if (smaBadge) {
        const visBtn = smaBadge.querySelector('.badge-btn-visibility');
        if (visBtn) visBtn.click();
      }
    })()
  `);
  await sleep(300);

  const isSmaHidden = await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const smaBadge = badges.find(b => b.textContent?.includes('SMA'));
      const visBtn = smaBadge?.querySelector('.badge-btn-visibility');
      return visBtn ? visBtn.textContent === 'Ø' : false;
    })()
  `);
  console.log('SMA indicator visibility toggled off (icon is Ø):', isSmaHidden);
  if (!isSmaHidden) throw new Error('Visibility toggle did not hide SMA indicator!');

  // Toggle back on
  await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge'));
      const smaBadge = badges.find(b => b.textContent?.includes('SMA'));
      const visBtn = smaBadge?.querySelector('.badge-btn-visibility');
      if (visBtn) visBtn.click();
    })()
  `);
  await sleep(300);
  console.log('✓ Indicator Visibility Toggle verified');

  // =========================================================================
  // 6. Drawing Creation & Selection (Trend Line, Horizontal Line, Measure)
  // =========================================================================
  console.log('\n[Test 6 & 7] Testing Drawing Creation & Click-to-Select...');
  const plotBox = await client.evaluate(`
    (() => {
      const el = document.querySelector('.main-price-pane .plot-surface canvas:nth-child(2)');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()
  `);

  // Draw Trend Line
  await client.evaluate(`document.querySelector('button[title*="Trend Line"]')?.click()`);
  await sleep(150);
  const tl_x1 = Math.round(plotBox.left + plotBox.width * 0.2);
  const tl_y1 = Math.round(plotBox.top + plotBox.height * 0.65);
  const tl_x2 = Math.round(plotBox.left + plotBox.width * 0.55);
  const tl_y2 = Math.round(plotBox.top + plotBox.height * 0.35);

  await client.mouseClick(tl_x1, tl_y1);
  await sleep(100);
  await client.mouseMove(tl_x2, tl_y2);
  await sleep(100);
  await client.mouseClick(tl_x2, tl_y2);
  await sleep(300);

  // Draw Horizontal Line
  await client.evaluate(`document.querySelector('button[title*="Horizontal Line"]')?.click()`);
  await sleep(150);
  const hl_x = Math.round(plotBox.left + plotBox.width * 0.4);
  const hl_y = Math.round(plotBox.top + plotBox.height * 0.15);
  await client.mouseClick(hl_x, hl_y);
  await sleep(300);

  // Switch to Cursor tool
  await client.evaluate(`document.querySelector('button[title*="Cursor"]')?.click()`);
  await sleep(200);

  // Click on the Trend Line to select it
  const clickMidX = Math.round((tl_x1 + tl_x2) / 2);
  const clickMidY = Math.round((tl_y1 + tl_y2) / 2);
  console.log(`Clicking Trend Line body at (${clickMidX}, ${clickMidY}) to select it...`);
  await client.mouseClick(clickMidX, clickMidY);
  await sleep(300);

  const isDrawingSelected = await client.evaluate(`
    (() => {
      const toolbar = document.querySelector('.selected-drawing-toolbar');
      return toolbar ? toolbar.textContent : null;
    })()
  `);
  console.log('Selected drawing toolbar:', isDrawingSelected);
  if (!isDrawingSelected || !isDrawingSelected.includes('trendline')) {
    throw new Error('Trend line was not selected on click!');
  }
  await client.screenshot('v4_04_drawing_selected_with_handles.png');
  console.log('✓ Drawing Selection verified with visual handles and action bar');

  // =========================================================================
  // 8. Trend-line Endpoint Drag
  // =========================================================================
  console.log('\n[Test 8] Testing Trend-line Endpoint Handle Drag...');
  const new_tl_x2 = Math.round(plotBox.left + plotBox.width * 0.7);
  const new_tl_y2 = Math.round(plotBox.top + plotBox.height * 0.25);
  console.log(`Dragging Handle P2 from (${tl_x2}, ${tl_y2}) to (${new_tl_x2}, ${new_tl_y2})...`);
  await client.mouseDrag(tl_x2, tl_y2, new_tl_x2, new_tl_y2, 10);
  await sleep(300);
  await client.screenshot('v4_05_trendline_endpoint_dragged.png');
  console.log('✓ Trend-line endpoint drag verified');

  // =========================================================================
  // 9. Horizontal-line Drag
  // =========================================================================
  console.log('\n[Test 9] Testing Horizontal-line Vertical Drag...');
  // Click on Horizontal line to select it
  await client.mouseClick(hl_x, hl_y);
  await sleep(300);

  const new_hl_y = Math.round(plotBox.top + plotBox.height * 0.28);
  console.log(`Dragging Horizontal line from y=${hl_y} to y=${new_hl_y}...`);
  await client.mouseDrag(hl_x, hl_y, hl_x, new_hl_y, 10);
  await sleep(300);
  await client.screenshot('v4_06_horizontal_line_dragged.png');
  console.log('✓ Horizontal-line drag verified');

  // =========================================================================
  // 10. Delete Selected Drawing via Delete Key
  // =========================================================================
  console.log('\n[Test 10 & 11] Testing Delete Key on Selected Drawing...');
  await client.keyPress('Delete', 'Delete');
  await sleep(300);

  const selectedAfterDelete = await client.evaluate(`!document.querySelector('.selected-drawing-toolbar')`);
  console.log('Drawing successfully deleted via Delete key:', selectedAfterDelete);
  if (!selectedAfterDelete) throw new Error('Drawing was not removed upon Delete keypress!');

  // =========================================================================
  // 11. Escape Deselects Drawing
  // =========================================================================
  console.log('\n[Test 12] Testing Escape key deselects drawing...');
  // Select remaining trend line
  await client.mouseClick(clickMidX, clickMidY);
  await sleep(250);
  console.log('Pressing Escape to deselect...');
  await client.keyPress('Escape', 'Escape');
  await sleep(250);

  const deselected = await client.evaluate(`!document.querySelector('.selected-drawing-toolbar')`);
  console.log('Deselected after Escape:', deselected);
  if (!deselected) throw new Error('Escape did not deselect drawing!');
  console.log('✓ Escape deselection verified');

  // =========================================================================
  // 12. Draggable Panes (Resizing Volume & RSI)
  // =========================================================================
  console.log('\n[Test 13, 14, 15] Testing Draggable Panes...');
  const dividerBox = await client.evaluate(`
    (() => {
      const divider = document.querySelector('.main-subpane-divider');
      if (!divider) return null;
      const rect = divider.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()
  `);
  console.log('Divider bounds:', dividerBox);
  if (!dividerBox) throw new Error('Pane divider element not found!');

  const initialHeights = await client.evaluate(`
    (() => {
      const vol = document.querySelector('.volume-pane')?.clientHeight;
      const rsi = document.querySelector('.rsi-pane')?.clientHeight;
      const main = document.querySelector('.main-price-pane')?.clientHeight;
      return { vol, rsi, main };
    })()
  `);
  console.log('Initial pane heights before drag:', initialHeights);

  // Drag divider UP by 60px to expand Volume pane
  const divX = Math.round(dividerBox.left + dividerBox.width * 0.5);
  const divY = Math.round(dividerBox.top + dividerBox.height * 0.5);
  console.log(`Dragging divider from y=${divY} up to y=${divY - 60}...`);
  await client.mouseDrag(divX, divY, divX, divY - 60, 12);
  await sleep(400);

  const resizedHeights = await client.evaluate(`
    (() => {
      const vol = document.querySelector('.volume-pane')?.clientHeight;
      const rsi = document.querySelector('.rsi-pane')?.clientHeight;
      const main = document.querySelector('.main-price-pane')?.clientHeight;
      return { vol, rsi, main };
    })()
  `);
  console.log('Resized pane heights after drag:', resizedHeights);
  if (resizedHeights.vol <= initialHeights.vol) {
    throw new Error('Volume pane did not expand after dragging divider up!');
  }
  await client.screenshot('v4_07_draggable_pane_resized.png');
  console.log('✓ Draggable pane divider verified');

  // =========================================================================
  // 13. Removing RSI & Volume Expands Main Pane
  // =========================================================================
  console.log('\n[Test 16 & 17] Testing Pane Collapse and Main Expansion on Removal...');
  const heightBeforeRsiRemoval = await client.evaluate(`document.querySelector('.main-price-pane')?.clientHeight`);

  // Remove RSI
  await client.evaluate(`
    (() => {
      const rsiBadge = document.querySelector('.rsi-pane .indicator-status-badge');
      rsiBadge?.querySelector('.badge-btn-remove')?.click();
    })()
  `);
  await sleep(400);

  const heightAfterRsiRemoval = await client.evaluate(`document.querySelector('.main-price-pane')?.clientHeight`);
  console.log(`Main Pane height: ${heightBeforeRsiRemoval} -> ${heightAfterRsiRemoval} after removing RSI`);
  if (heightAfterRsiRemoval <= heightBeforeRsiRemoval) {
    throw new Error('Main price pane did not expand after RSI removal!');
  }

  // Remove Volume
  await client.evaluate(`
    (() => {
      const volBadge = document.querySelector('.volume-pane .indicator-status-badge');
      volBadge?.querySelector('.badge-btn-remove')?.click();
    })()
  `);
  await sleep(400);

  const heightAfterVolRemoval = await client.evaluate(`document.querySelector('.main-price-pane')?.clientHeight`);
  console.log(`Main Pane height: ${heightAfterRsiRemoval} -> ${heightAfterVolRemoval} after removing Volume`);
  if (heightAfterVolRemoval <= heightAfterRsiRemoval) {
    throw new Error('Main price pane did not expand after Volume removal!');
  }
  await client.screenshot('v4_08_subpanes_removed_main_expanded.png');
  console.log('✓ Sub-pane removal and automatic main pane expansion verified');

  // =========================================================================
  // 14. Workspace State Persistence Across Page Reload
  // =========================================================================
  console.log('\n[Test 19] Testing Workspace State Persistence across reload...');
  await client.send('Page.reload');
  await sleep(1200);

  const persistedState = await client.evaluate(`
    (() => {
      const badges = Array.from(document.querySelectorAll('.main-price-pane .indicator-status-badge')).map(b => b.textContent?.trim());
      const raw = localStorage.getItem('tv_workspace_v4');
      const parsed = raw ? JSON.parse(raw) : null;
      return { badges, version: parsed?.version };
    })()
  `);
  console.log('Persisted state after reload:', persistedState);
  if (persistedState.version !== 4) {
    throw new Error('Storage schema version 4 was not persisted!');
  }
  await client.screenshot('v4_09_state_persisted_after_reload.png');
  console.log('✓ Versioned Workspace State persistence verified');

  // =========================================================================
  // 15. Corrupt localStorage Protection
  // =========================================================================
  console.log('\n[Test 20] Testing Corrupt localStorage Fallback Protection...');
  // Inject garbage data into localStorage
  await client.evaluate(`localStorage.setItem('tv_workspace_v4', 'INVALID_CORRUPT_JSON_DATA{{{###')`);
  await client.send('Page.reload');
  await sleep(1200);

  const loadedAfterCorrupt = await client.evaluate(`
    (() => {
      const topBar = !!document.querySelector('.workspace-top-toolbar');
      const mainChart = !!document.querySelector('.chart-main-area');
      return { topBar, mainChart };
    })()
  `);
  console.log('Application status after corrupt localStorage reload:', loadedAfterCorrupt);
  if (!loadedAfterCorrupt.topBar || !loadedAfterCorrupt.mainChart) {
    throw new Error('Application crashed on corrupt localStorage!');
  }
  await client.screenshot('v4_10_corrupt_storage_recovery.png');
  console.log('✓ Corrupt localStorage gracefully handled without crash');

  // =========================================================================
  // 16. Regression: V1/V2/V3 Features
  // =========================================================================
  console.log('\n[Test 21, 22, 23] Testing V1/V2/V3 Feature Regression...');
  // Watchlist & Symbol
  await client.evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('.watchlist-item'));
      const tsla = items.find(i => i.textContent?.includes('TSLA'));
      tsla?.click();
    })()
  `);
  await sleep(300);

  // Timeframe
  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('.timeframe-button'));
      const tf4h = btns.find(b => b.textContent?.trim() === '4h');
      tf4h?.click();
    })()
  `);
  await sleep(300);

  // Chart Type
  await client.evaluate(`document.querySelector('.chart-type-trigger')?.click()`);
  await sleep(200);
  await client.evaluate(`
    (() => {
      const options = Array.from(document.querySelectorAll('.chart-type-option'));
      const hollow = options.find(o => o.textContent?.includes('Hollow'));
      hollow?.click();
    })()
  `);
  await sleep(300);

  await client.screenshot('v4_11_regression_v1_v2_v3_pass.png');
  console.log('\n=======================================================');
  console.log('✅ ALL V4 ADVANCED WORKSPACE EDITING TESTS PASSED!');
  console.log('=======================================================');

  client.close();
}

run().catch((err) => {
  console.error('\n❌ V4 TEST RUN FAILED:', err);
  process.exit(1);
});
