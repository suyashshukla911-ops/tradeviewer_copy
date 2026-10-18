import fs from 'fs';

const targetId = 'FD05BC93CFF5A3F5479D44597123A427';
const wsUrl = `ws://127.0.0.1:9222/devtools/page/${targetId}`;

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

  async sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

async function run() {
  console.log('Connecting to CDP...');
  const client = new CDPClient(wsUrl);
  await client.connect();
  console.log('Connected to target!');

  const artifactDir = 'C:/Users/Suyash Shukla/.gemini/antigravity/brain/8ab8e868-c44b-464e-9533-0e8bb7841bdd';

  // 1. Crosshair test: mouse move over plot area (450, 300)
  console.log('Testing crosshair...');
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: 450,
    y: 300,
  });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/1_crosshair.png`);

  // 2. Pan test: drag horizontally from 450 to 250
  console.log('Testing horizontal pan...');
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    buttons: 1,
    x: 450,
    y: 300,
  });
  await client.sleep(50);
  for (let x = 450; x >= 250; x -= 25) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      buttons: 1,
      x: x,
      y: 300,
    });
    await client.sleep(20);
  }
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    buttons: 0,
    x: 250,
    y: 300,
  });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/2_pan.png`);

  // 3. Wheel zoom test: zoom in at pointer 350
  console.log('Testing wheel zoom...');
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: 350,
    y: 300,
    deltaX: 0,
    deltaY: -300,
  });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/3_wheel_zoom.png`);

  // 4. Price scale zoom test: drag on right margin (x = 1005, y = 300)
  console.log('Testing price-scale zoom...');
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    buttons: 1,
    x: 1005,
    y: 300,
  });
  await client.sleep(50);
  for (let y = 300; y <= 420; y += 15) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      buttons: 1,
      x: 1005,
      y: y,
    });
    await client.sleep(20);
  }
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    buttons: 0,
    x: 1005,
    y: 420,
  });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/4_price_scale_zoom.png`);

  // 5. Time scale zoom test: drag on bottom scale (x = 500, y = 590)
  console.log('Testing time-scale zoom...');
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    buttons: 1,
    x: 500,
    y: 590,
  });
  await client.sleep(50);
  for (let x = 500; x <= 650; x += 25) {
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      buttons: 1,
      x: x,
      y: 590,
    });
    await client.sleep(20);
  }
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    buttons: 0,
    x: 650,
    y: 590,
  });
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/5_time_scale_zoom.png`);

  // 6. Chart type: Line test
  console.log('Testing chart type: Line...');
  // Find "Line" button
  const doc = await client.send('DOM.getDocument');
  const lineNode = await client.send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'button[title="Line Area"]',
  });
  if (lineNode.nodeId) {
    const box = await client.send('DOM.getBoxModel', { nodeId: lineNode.nodeId });
    const [x, y] = [box.model.content[0] + 15, box.model.content[1] + 10];
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, x, y });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, x, y });
  }
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/6_chart_type_line.png`);

  // 7. Chart type: Bars test
  console.log('Testing chart type: Bars...');
  const barsNode = await client.send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'button[title="OHLC Bars"]',
  });
  if (barsNode.nodeId) {
    const box = await client.send('DOM.getBoxModel', { nodeId: barsNode.nodeId });
    const [x, y] = [box.model.content[0] + 15, box.model.content[1] + 10];
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, x, y });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, x, y });
  }
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/7_chart_type_bars.png`);

  // 8. Chart type: Candles test
  console.log('Testing chart type: Candles...');
  const candlesNode = await client.send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'button[title="Candles"]',
  });
  if (candlesNode.nodeId) {
    const box = await client.send('DOM.getBoxModel', { nodeId: candlesNode.nodeId });
    const [x, y] = [box.model.content[0] + 15, box.model.content[1] + 10];
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, x, y });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, x, y });
  }
  await client.sleep(200);

  // 9. Reset View test
  console.log('Testing Reset View...');
  const resetNode = await client.send('DOM.querySelector', {
    nodeId: doc.root.nodeId,
    selector: 'button[title*="Reset chart view"]',
  });
  if (resetNode.nodeId) {
    const box = await client.send('DOM.getBoxModel', { nodeId: resetNode.nodeId });
    const [x, y] = [box.model.content[0] + 25, box.model.content[1] + 10];
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', buttons: 1, clickCount: 1, x, y });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', buttons: 0, clickCount: 1, x, y });
  }
  await client.sleep(200);
  await client.screenshot(`${artifactDir}/8_reset_view.png`);

  // 10. Resizing test
  console.log('Testing ResizeObserver responsive resize...');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 650,
    height: 400,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.sleep(300);
  await client.screenshot(`${artifactDir}/9_resize_small.png`);

  // Restore metrics
  await client.send('Emulation.clearDeviceMetricsOverride');
  await client.sleep(200);

  console.log('All 10 interaction validations completed successfully!');
  client.ws.close();
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
