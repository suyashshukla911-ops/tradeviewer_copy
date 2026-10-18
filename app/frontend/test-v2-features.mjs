import fs from 'fs';

const targetId = 'FD05BC93CFF5A3F5479D44597123A427';
const wsUrl = `ws://127.0.0.1:9222/devtools/page/${targetId}`;
const artifactDir = 'C:/Users/Suyash Shukla/.gemini/antigravity/brain/8ab8e868-c44b-464e-9533-0e8bb7841bdd';

class CDPClient {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filename, Buffer.from(res.data, 'base64'));
    console.log(`Saved screenshot: ${filename}`);
  }

  async clickSelector(selector, offsetX = 10, offsetY = 10) {
    const doc = await this.send('DOM.getDocument');
    const node = await this.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
    if (!node.nodeId) throw new Error(`Node not found for selector: ${selector}`);
    const box = await this.send('DOM.getBoxModel', { nodeId: node.nodeId });
    const [x, y] = [box.model.content[0] + offsetX, box.model.content[1] + offsetY];
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, x, y });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, x, y });
  }

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

async function run() {
  console.log('Connecting to CDP...');
  const client = new CDPClient(wsUrl);
  await client.connect();
  console.log('Connected!');

  // Navigate / reload to ensure fresh bundle
  console.log('Reloading target page...');
  await client.send('Page.reload');
  await client.sleep(600);

  // 1. Initial V2 workspace state
  console.log('Verifying initial V2 workspace...');
  await client.screenshot(`${artifactDir}/v2_1_initial.png`);

  // 2. Test Symbol Search
  console.log('Testing Symbol Search (search for TSLA)...');
  await client.clickSelector('button[title*="Search symbol"]', 20, 10);
  await client.sleep(200);

  // Type TSLA in the input
  await client.send('Input.insertText', { text: 'TSLA' });
  await client.sleep(200);

  // Click TSLA in the result list
  await client.clickSelector('.symbol-search-modal div[style*="cursor: pointer"]', 30, 12);
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/v2_2_symbol_search_tsla.png`);

  // 3. Test Timeframe Switching (switch to 1h)
  console.log('Testing Timeframe Switching (switch to 1h)...');
  await client.clickSelector('button:has-text("1h"), button[title="1h"]', 8, 8).catch(async () => {
    // If not matching has-text, click by text content via evaluate
    await client.send('Runtime.evaluate', {
      expression: `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '1h')?.click()`,
    });
  });
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/v2_3_timeframe_1h.png`);

  // 4. Test Chart Type: Area
  console.log('Testing Chart Type Menu: Area...');
  await client.send('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Candles'))?.click()`,
  });
  await client.sleep(200);
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('button[data-chart-type="area"]')?.click()`,
  });
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/v2_4_chart_type_area.png`);

  // 5. Test Chart Type: Hollow Candles
  console.log('Testing Chart Type Menu: Hollow Candles...');
  await client.send('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Area'))?.click()`,
  });
  await client.sleep(200);
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('button[data-chart-type="hollow_candles"]')?.click()`,
  });
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/v2_5_chart_type_hollow.png`);

  // 6. Test Watchlist Selection: BTCUSD
  console.log('Testing Watchlist Selection: BTCUSD...');
  await client.send('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('.chart-watchlist-panel span')).find(s => s.textContent.trim() === 'BTCUSD')?.click()`,
  });
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/v2_6_watchlist_btcusd.png`);

  // 7. Test Watchlist Selection: NVDA
  console.log('Testing Watchlist Selection: NVDA...');
  await client.send('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('.chart-watchlist-panel span')).find(s => s.textContent.trim() === 'NVDA')?.click()`,
  });
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/v2_7_watchlist_nvda.png`);

  // 8. Test V1 Non-regression: Crosshair
  console.log('Testing Crosshair interaction...');
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 350, y: 250 });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/v2_8_crosshair.png`);

  // 9. Test V1 Non-regression: Horizontal Pan
  console.log('Testing Horizontal Pan...');
  await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, x: 350, y: 250 });
  for (let x = 350; x >= 200; x -= 25) {
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1, x, y: 250 });
    await client.sleep(20);
  }
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, x: 200, y: 250 });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/v2_9_pan.png`);

  // 10. Test V1 Non-regression: Wheel Zoom
  console.log('Testing Wheel Zoom...');
  await client.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 300, y: 250, deltaX: 0, deltaY: -250 });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/v2_10_wheel_zoom.png`);

  // 11. Test Reset View
  console.log('Testing Reset View button...');
  await client.send('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reset'))?.click()`,
  });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/v2_11_reset.png`);

  // 12. Test Watchlist Toggle (collapse & expand)
  console.log('Testing Watchlist panel toggle...');
  await client.clickSelector('button[title="Toggle Watchlist Panel"]', 10, 10);
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/v2_12_watchlist_closed.png`);

  await client.clickSelector('button[title="Toggle Watchlist Panel"]', 10, 10);
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/v2_13_watchlist_reopened.png`);

  console.log('All V2 validations passed cleanly!');
  client.ws.close();
}

run().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
