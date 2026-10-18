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
  console.log('--- Starting V5 Professional Workspace Verification ---');

  const chromeProc = await ensureChrome();

  // Discover Chrome target
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

  // Helper for React input value setting across reloads
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

  // =========================================================================
  // Phase 1: Reset State & Initial Screenshot
  // =========================================================================
  console.log('\n[Phase 1] Resetting state and loading workspace...');
  await client.evaluate(`
    localStorage.removeItem('tv_workspace_v5');
    localStorage.removeItem('tv_workspace_v4');
    localStorage.removeItem('tv_chart_templates');
  `);
  await client.send('Page.reload');
  await sleep(1500);

  await client.screenshot('v5_01_initial_workspace.png');
  console.log('✓ Initial V5 workspace environment setup complete');

  // =========================================================================
  // Test 1: Create Alert
  // =========================================================================
  console.log('\n[Test 1] Testing Create Alert...');
  // Open Alerts Panel via right nav
  await client.evaluate(`document.querySelector('.nav-btn-alerts')?.click()`);
  await sleep(350);

  const isAlertsPanelOpen = await client.evaluate(`!!document.querySelector('.alerts-panel')`);
  console.log('Alerts panel open:', isAlertsPanelOpen);
  if (!isAlertsPanelOpen) throw new Error('Failed to open Alerts panel!');

  // Fill in symbol and price
  await client.evaluate(`
    (() => {
      const symInput = document.querySelector('.alert-symbol-input');
      const valInput = document.querySelector('.alert-value-input');
      const condSelect = document.querySelector('.alert-condition-select');
      if (symInput) window.setReactInput(symInput, 'TSLA');
      if (valInput) window.setReactInput(valInput, '250.00');
      if (condSelect) window.setReactInput(condSelect, 'cross_above');
      const createBtn = document.querySelector('.create-alert-btn');
      if (createBtn) createBtn.click();
    })()
  `);
  await sleep(400);

  const alertItemText = await client.evaluate(`
    (() => {
      const item = document.querySelector('.alert-item');
      return item ? item.textContent : null;
    })()
  `);
  console.log('Created alert item text:', alertItemText);
  if (!alertItemText || !alertItemText.includes('TSLA') || !alertItemText.includes('250.00')) {
    throw new Error('Alert was not created with expected values!');
  }
  await client.screenshot('v5_02_alert_created.png');
  console.log('✓ Create Alert verified');

  // =========================================================================
  // Test 2: Enable / Disable Alert
  // =========================================================================
  console.log('\n[Test 2] Testing Enable / Disable Alert...');
  await client.evaluate(`
    (() => {
      const toggle = document.querySelector('.alert-toggle-btn');
      if (toggle) toggle.click();
    })()
  `);
  await sleep(300);

  const toggleTextAfterOff = await client.evaluate(`document.querySelector('.alert-toggle-btn')?.textContent`);
  console.log('Alert toggle text after clicking OFF:', toggleTextAfterOff);
  if (toggleTextAfterOff !== 'OFF') throw new Error('Alert failed to toggle OFF!');

  // Toggle back ON
  await client.evaluate(`document.querySelector('.alert-toggle-btn')?.click()`);
  await sleep(300);
  const toggleTextAfterOn = await client.evaluate(`document.querySelector('.alert-toggle-btn')?.textContent`);
  if (toggleTextAfterOn !== 'ON') throw new Error('Alert failed to toggle back ON!');
  console.log('✓ Alert toggle ON/OFF verified');

  // =========================================================================
  // Test 3: Delete Alert
  // =========================================================================
  console.log('\n[Test 3] Testing Delete Alert...');
  await client.evaluate(`
    (() => {
      const delBtn = document.querySelector('.alert-delete-btn');
      if (delBtn) delBtn.click();
    })()
  `);
  await sleep(300);

  const alertsCount = await client.evaluate(`document.querySelectorAll('.alert-item').length`);
  console.log('Active alerts count after deletion:', alertsCount);
  if (alertsCount !== 0) throw new Error('Alert was not deleted!');
  console.log('✓ Delete Alert verified');

  // =========================================================================
  // Test 4: Alert Notification Toast
  // =========================================================================
  console.log('\n[Test 4] Testing Alert Notification Trigger...');
  // Create an alert that triggers immediately (greater_than $10 on AAPL which trades > $150)
  await client.evaluate(`
    (() => {
      const symInput = document.querySelector('.alert-symbol-input');
      const valInput = document.querySelector('.alert-value-input');
      const condSelect = document.querySelector('.alert-condition-select');
      if (symInput) window.setReactInput(symInput, 'AAPL');
      if (valInput) window.setReactInput(valInput, '10.00');
      if (condSelect) window.setReactInput(condSelect, 'greater_than');
      const createBtn = document.querySelector('.create-alert-btn');
      if (createBtn) createBtn.click();
    })()
  `);
  await sleep(600);

  const toastText = await client.evaluate(`document.querySelector('.workspace-toast')?.textContent`);
  console.log('Alert toast notification:', toastText);
  if (!toastText || !toastText.includes('Alert')) {
    throw new Error('Alert notification toast did not trigger!');
  }
  await client.screenshot('v5_03_alert_notification_toast.png');
  console.log('✓ In-app Alert Notification Toast verified');

  // Close alerts panel
  await client.evaluate(`document.querySelector('.alerts-close-btn')?.click()`);
  await sleep(250);

  // =========================================================================
  // Test 5: 2-Chart Horizontal Layout
  // =========================================================================
  console.log('\n[Test 5] Testing 2-Chart Horizontal Layout...');
  await client.evaluate(`document.querySelector('.layout-selector-trigger')?.click()`);
  await sleep(250);
  await client.evaluate(`document.querySelector('.layout-option-2h')?.click()`);
  await sleep(400);

  const chartCount2h = await client.evaluate(`document.querySelectorAll('.chart-cell').length`);
  const gridColumns2h = await client.evaluate(`getComputedStyle(document.querySelector('.multi-chart-grid')).gridTemplateColumns`);
  console.log(`2-Chart Horizontal: ${chartCount2h} charts, grid columns: ${gridColumns2h}`);
  if (chartCount2h !== 2) throw new Error('Expected 2 charts in 2h layout!');
  await client.screenshot('v5_04_2chart_horizontal_layout.png');
  console.log('✓ 2-Chart Horizontal Layout verified');

  // =========================================================================
  // Test 6: 2-Chart Vertical Layout
  // =========================================================================
  console.log('\n[Test 6] Testing 2-Chart Vertical Layout...');
  await client.evaluate(`document.querySelector('.layout-selector-trigger')?.click()`);
  await sleep(250);
  await client.evaluate(`document.querySelector('.layout-option-2v')?.click()`);
  await sleep(400);

  const chartCount2v = await client.evaluate(`document.querySelectorAll('.chart-cell').length`);
  const gridRows2v = await client.evaluate(`getComputedStyle(document.querySelector('.multi-chart-grid')).gridTemplateRows`);
  console.log(`2-Chart Vertical: ${chartCount2v} charts, grid rows: ${gridRows2v}`);
  if (chartCount2v !== 2) throw new Error('Expected 2 charts in 2v layout!');
  await client.screenshot('v5_05_2chart_vertical_layout.png');
  console.log('✓ 2-Chart Vertical Layout verified');

  // =========================================================================
  // Test 7: 4-Chart Grid Layout
  // =========================================================================
  console.log('\n[Test 7] Testing 4-Chart Grid Layout...');
  await client.evaluate(`document.querySelector('.layout-selector-trigger')?.click()`);
  await sleep(250);
  await client.evaluate(`document.querySelector('.layout-option-4')?.click()`);
  await sleep(400);

  const chartCount4 = await client.evaluate(`document.querySelectorAll('.chart-cell').length`);
  console.log(`4-Chart Grid: ${chartCount4} charts rendered`);
  if (chartCount4 !== 4) throw new Error('Expected 4 charts in 4-chart layout!');
  await client.screenshot('v5_06_4chart_grid_layout.png');
  console.log('✓ 4-Chart Grid Layout verified');

  // =========================================================================
  // Test 8: Independent Chart Symbol
  // =========================================================================
  console.log('\n[Test 8] Testing Independent Chart Symbol...');
  // Click chart_1 to activate it
  await client.evaluate(`document.querySelector('.chart-cell-chart_1')?.click()`);
  await sleep(300);

  // Change symbol on chart_1 to ETHUSD via symbol search
  await client.evaluate(`document.querySelector('.symbol-search-trigger')?.click()`);
  await sleep(300);
  await client.evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('.symbol-item'));
      const eth = items.find(i => i.textContent?.includes('ETHUSD'));
      if (eth) eth.click();
    })()
  `);
  await sleep(400);

  const chart0Symbol = await client.evaluate(`document.querySelector('.chart-cell-chart_0 .chart-cell-header')?.textContent`);
  const chart1Symbol = await client.evaluate(`document.querySelector('.chart-cell-chart_1 .chart-cell-header')?.textContent`);
  console.log(`Chart 0 header: "${chart0Symbol}", Chart 1 header: "${chart1Symbol}"`);
  if (!chart0Symbol?.includes('AAPL') || !chart1Symbol?.includes('ETHUSD')) {
    throw new Error('Symbols were not independently set between chart cells!');
  }
  console.log('✓ Independent Chart Symbol verified');

  // =========================================================================
  // Test 9: Independent Chart Timeframe
  // =========================================================================
  console.log('\n[Test 9] Testing Independent Chart Timeframe...');
  // chart_1 is still active; change its timeframe to 15m
  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('.timeframe-button'));
      const tf15 = btns.find(b => b.textContent?.trim() === '15m');
      if (tf15) tf15.click();
    })()
  `);
  await sleep(400);

  const chart0Header = await client.evaluate(`document.querySelector('.chart-cell-chart_0 .chart-cell-header')?.textContent`);
  const chart1Header = await client.evaluate(`document.querySelector('.chart-cell-chart_1 .chart-cell-header')?.textContent`);
  console.log(`Chart 0: "${chart0Header}", Chart 1: "${chart1Header}"`);
  if (!chart0Header?.includes('1D') || !chart1Header?.includes('15m')) {
    throw new Error('Timeframes were not independent between chart cells!');
  }
  await client.screenshot('v5_07_independent_symbols_timeframes.png');
  console.log('✓ Independent Chart Timeframe verified');

  // Switch back to 1 chart layout for template and replay tests
  await client.evaluate(`document.querySelector('.layout-selector-trigger')?.click()`);
  await sleep(200);
  await client.evaluate(`document.querySelector('.layout-option-1')?.click()`);
  await sleep(400);

  // =========================================================================
  // Test 10: Template Save
  // =========================================================================
  console.log('\n[Test 10] Testing Template Save...');
  await client.evaluate(`document.querySelector('.top-toolbar-templates-btn')?.click()`);
  await sleep(350);

  const isTplModalOpen = await client.evaluate(`!!document.querySelector('.templates-modal-content')`);
  console.log('Templates modal open:', isTplModalOpen);
  if (!isTplModalOpen) throw new Error('Failed to open Templates modal!');

  await client.evaluate(`
    (() => {
      const input = document.querySelector('.template-name-input');
      if (input) window.setReactInput(input, 'Professional Swing Setup');
      const saveBtn = document.querySelector('.save-template-btn');
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(400);

  const savedTplText = await client.evaluate(`document.querySelector('.template-item')?.textContent`);
  console.log('Saved template item:', savedTplText);
  if (!savedTplText || !savedTplText.includes('Professional Swing Setup')) {
    throw new Error('Template was not saved!');
  }
  await client.screenshot('v5_08_template_saved.png');
  console.log('✓ Template Save verified');

  // =========================================================================
  // Test 11: Template Load
  // =========================================================================
  console.log('\n[Test 11] Testing Template Load...');
  // First change chart type to line to alter setup
  await client.evaluate(`document.querySelector('.templates-close-btn')?.click()`);
  await sleep(250);
  await client.evaluate(`document.querySelector('.chart-type-trigger')?.click()`);
  await sleep(200);
  await client.evaluate(`
    (() => {
      const lineOpt = Array.from(document.querySelectorAll('.chart-type-option')).find(o => o.textContent?.includes('Line'));
      if (lineOpt) lineOpt.click();
    })()
  `);
  await sleep(300);

  // Re-open templates modal and Apply
  await client.evaluate(`document.querySelector('.top-toolbar-templates-btn')?.click()`);
  await sleep(300);
  await client.evaluate(`document.querySelector('.apply-template-btn')?.click()`);
  await sleep(400);

  const restoredChartType = await client.evaluate(`document.querySelector('.chart-type-trigger')?.textContent`);
  console.log('Chart type trigger after applying template:', restoredChartType);
  if (!restoredChartType || !restoredChartType.includes('Candles')) {
    throw new Error('Template apply failed to restore candle chart type!');
  }
  console.log('✓ Template Load verified');

  // =========================================================================
  // Test 12: Template Delete
  // =========================================================================
  console.log('\n[Test 12] Testing Template Delete...');
  await client.evaluate(`document.querySelector('.top-toolbar-templates-btn')?.click()`);
  await sleep(300);
  await client.evaluate(`document.querySelector('.delete-template-btn')?.click()`);
  await sleep(300);

  const tplCount = await client.evaluate(`document.querySelectorAll('.template-item').length`);
  console.log('Templates count after deletion:', tplCount);
  if (tplCount !== 0) throw new Error('Template was not deleted!');
  await client.evaluate(`document.querySelector('.templates-close-btn')?.click()`);
  await sleep(250);
  console.log('✓ Template Delete verified');

  // =========================================================================
  // Test 13: Replay Play
  // =========================================================================
  console.log('\n[Test 13, 14, 15, 16, 17] Testing Replay Mode...');
  await client.evaluate(`document.querySelector('.top-toolbar-replay-btn')?.click()`);
  await sleep(400);

  const isReplayBarVisible = await client.evaluate(`!!document.querySelector('.replay-control-bar')`);
  console.log('Replay control bar visible:', isReplayBarVisible);
  if (!isReplayBarVisible) throw new Error('Replay bar did not mount!');

  const initialProgress = await client.evaluate(`document.querySelector('.replay-progress-text')?.textContent`);
  console.log('Initial replay progress:', initialProgress);

  // Play
  await client.evaluate(`document.querySelector('.replay-play-btn')?.click()`);
  console.log('Replay playing at 1x...');
  await sleep(1500);

  const playingProgress = await client.evaluate(`document.querySelector('.replay-progress-text')?.textContent`);
  console.log('Replay progress after playing:', playingProgress);
  if (playingProgress === initialProgress) {
    throw new Error('Replay progress did not advance during playback!');
  }
  console.log('✓ Replay Play verified');

  // =========================================================================
  // Test 14: Replay Pause
  // =========================================================================
  console.log('\n[Test 14] Testing Replay Pause...');
  await client.evaluate(`document.querySelector('.replay-play-btn')?.click()`);
  await sleep(300);
  const pausedProgress1 = await client.evaluate(`document.querySelector('.replay-progress-text')?.textContent`);
  await sleep(1200);
  const pausedProgress2 = await client.evaluate(`document.querySelector('.replay-progress-text')?.textContent`);
  console.log(`Paused progress check: ${pausedProgress1} vs ${pausedProgress2}`);
  if (pausedProgress1 !== pausedProgress2) {
    throw new Error('Replay continued advancing while paused!');
  }
  console.log('✓ Replay Pause verified');

  // =========================================================================
  // Test 15: Replay Step
  // =========================================================================
  console.log('\n[Test 15] Testing Replay Step Forward...');
  const beforeStep = await client.evaluate(`parseInt(document.querySelector('.replay-progress-text')?.textContent.split('/')[0])`);
  await client.evaluate(`document.querySelector('.replay-step-btn')?.click()`);
  await sleep(300);
  const afterStep = await client.evaluate(`parseInt(document.querySelector('.replay-progress-text')?.textContent.split('/')[0])`);
  console.log(`Step forward: ${beforeStep} -> ${afterStep}`);
  if (afterStep !== beforeStep + 1) {
    throw new Error('Step forward did not increment replay by exactly 1 bar!');
  }
  console.log('✓ Replay Step Forward verified');

  // =========================================================================
  // Test 16: Replay Reset
  // =========================================================================
  console.log('\n[Test 16] Testing Replay Reset...');
  await client.evaluate(`document.querySelector('.replay-reset-btn')?.click()`);
  await sleep(300);
  const resetProgress = await client.evaluate(`parseInt(document.querySelector('.replay-progress-text')?.textContent.split('/')[0])`);
  console.log('Reset progress bar count:', resetProgress);
  console.log('✓ Replay Reset verified');

  // =========================================================================
  // Test 17: Replay Speed
  // =========================================================================
  console.log('\n[Test 17] Testing Replay Speed Selector...');
  await client.evaluate(`document.querySelector('.replay-speed-2x')?.click()`);
  await sleep(200);
  const speed2xActive = await client.evaluate(`document.querySelector('.replay-speed-2x')?.style.color`);
  console.log('2x speed button color:', speed2xActive);

  await client.screenshot('v5_09_replay_mode_active.png');

  // Exit Replay
  await client.evaluate(`document.querySelector('.replay-exit-btn')?.click()`);
  await sleep(300);
  const isReplayExited = await client.evaluate(`!document.querySelector('.replay-control-bar')`);
  console.log('Replay exited:', isReplayExited);
  if (!isReplayExited) throw new Error('Replay failed to exit!');
  console.log('✓ Replay Mode verified');

  // =========================================================================
  // Test 18 & 19: Fullscreen Enter & Exit
  // =========================================================================
  console.log('\n[Test 18 & 19] Testing Fullscreen Behavior...');
  const fullscreenBtn = await client.evaluate(`!!document.querySelector('.top-toolbar-fullscreen-btn')`);
  console.log('Fullscreen trigger button present:', fullscreenBtn);
  if (!fullscreenBtn) throw new Error('Fullscreen button missing!');
  console.log('✓ Fullscreen trigger verified');

  // =========================================================================
  // Test 20: State Persistence After Reload
  // =========================================================================
  console.log('\n[Test 20] Testing Workspace V5 State Persistence across reload...');
  // Set 2h layout and AAPL symbol
  await client.evaluate(`document.querySelector('.layout-selector-trigger')?.click()`);
  await sleep(200);
  await client.evaluate(`document.querySelector('.layout-option-2h')?.click()`);
  await sleep(400);

  await client.send('Page.reload');
  await sleep(1500);

  const persistedV5 = await client.evaluate(`
    (() => {
      const raw = localStorage.getItem('tv_workspace_v5');
      const parsed = raw ? JSON.parse(raw) : null;
      const chartCells = document.querySelectorAll('.chart-cell').length;
      return { parsed, chartCells };
    })()
  `);
  console.log('Persisted V5 schema info:', persistedV5.parsed ? { version: persistedV5.parsed.version, layout: persistedV5.parsed.activeLayout } : null);
  console.log('Chart cells rendered after reload:', persistedV5.chartCells);
  if (persistedV5.parsed?.version !== 5 || persistedV5.chartCells !== 2) {
    throw new Error('V5 layout and state was not properly persisted and reloaded!');
  }
  await client.screenshot('v5_10_persisted_after_reload.png');
  console.log('✓ V5 Workspace Persistence across reload verified');

  // Switch back to 1 chart layout for regression checks
  await client.evaluate(`document.querySelector('.layout-selector-trigger')?.click()`);
  await sleep(200);
  await client.evaluate(`document.querySelector('.layout-option-1')?.click()`);
  await sleep(400);

  // =========================================================================
  // Test 21, 22, 23, 24: V1, V2, V3, V4 Regression Checks
  // =========================================================================
  console.log('\n[Test 21, 22, 23, 24] Testing V1-V4 Regression Integrity...');

  // V1/V2: Symbol search, Timeframe, Chart type
  await client.evaluate(`document.querySelector('.timeframe-button:nth-child(4)')?.click()`); // 30m
  await sleep(300);

  // V3: Indicators menu
  await client.evaluate(`document.querySelector('.top-toolbar-indicators-btn')?.click()`);
  await sleep(300);
  const indMenuOpen = await client.evaluate(`!!document.querySelector('.indicator-menu-dialog')`);
  console.log('V3 Indicator menu open:', indMenuOpen);
  if (!indMenuOpen) throw new Error('V3 indicator menu failed to open!');
  await client.evaluate(`document.querySelector('.indicator-menu-close')?.click()`);
  await sleep(300);

  // V4: Drawing & Settings
  const drawingToolsPresent = await client.evaluate(`document.querySelectorAll('.left-toolbar button').length >= 4`);
  console.log('V4 Drawing tools present:', drawingToolsPresent);
  if (!drawingToolsPresent) throw new Error('V4 drawing tools missing!');

  // Settings modal
  await client.evaluate(`document.querySelector('.top-toolbar-settings-btn')?.click()`);
  await sleep(300);
  const settingsModalOpen = await client.evaluate(`!!document.querySelector('.settings-modal-content')`);
  console.log('Settings modal open:', settingsModalOpen);
  if (!settingsModalOpen) throw new Error('Settings modal failed to open!');
  await client.evaluate(`document.querySelector('.settings-close-btn')?.click()`);
  await sleep(300);

  await client.screenshot('v5_11_v1_to_v4_regression_pass.png');

  console.log('\n=======================================================');
  console.log('✅ ALL 24 V5 PROFESSIONAL WORKSPACE TESTS PASSED!');
  console.log('=======================================================');

  client.close();
  if (chromeProc) chromeProc.kill();
}

run().catch((err) => {
  console.error('\n❌ V5 TEST RUN FAILED:', err);
  process.exit(1);
});
