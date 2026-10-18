# TradingView Chart Interaction Model Reverse-Engineering Analysis

> **Evidence Sources**:
> - Evidence JSON: `D:\TradingViewClone\rea-workspace\evidence\tradingview-interaction-evidence.json`
> - Base Evidence: `D:\TradingViewClone\rea-workspace\evidence\tradingview-workspace.json`
> - Screenshot Artifacts: `D:\TradingViewClone\rea-workspace\evidence\screenshots\*.png`
> 
> **Target Component**: Main Chart Viewport (`DIV 1510` / Accessibility Node `172: Chart #1`)  
> **Predicate**: Chrome DevTools Protocol (`CDP v1.3` on loopback `http://127.0.0.1:9222`)  
> **Document Status**: Purely observational reverse-engineering analysis. No application code or dependencies modified.

---

## 1. Overview of the Interaction Testing Rig

To observe real-time chart responses deterministically, an automated CDP interaction probe was executed against the active TradingView tab (`target_id: 9EEDFFC3B27AC40A64727704856F750C`).
- `OBSERVATION`: Viewport base resolution was established at $1034 \times 605 \text{ px}$ with a scale factor of 1.
- `OBSERVATION`: The 7 canvas elements of the main chart surface were mapped to exact screen coordinate bounding boxes:
  - **Canvas 0 & 1 (Main Plot Area)**: $x \in [56, 626], y \in [42, 538]$ (dimensions $570 \times 496 \text{ px}$). Canvas 0 has `data-name="pane-canvas"`; Canvas 1 has `aria-label="Chart for BATS:AAPL, 1 day"`.
  - **Canvas 2 & 3 (Price Scale / Y-Axis)**: $x \in [626, 684], y \in [42, 538]$ (dimensions $58 \times 496 \text{ px}$).
  - **Canvas 4 & 5 (Time Scale / X-Axis)**: $x \in [56, 626], y \in [538, 566]$ (dimensions $570 \times 28 \text{ px}$).
  - **Canvas 6 (Corner Axis Junction)**: $x \in [626, 684], y \in [538, 566]$ (dimensions $58 \times 28 \text{ px}$).
- `OBSERVATION`: Quantitative regional pixel delta analysis was performed across 6 discrete regions of interest:
  - `plot_area`: $570 \times 496 = 282,720 \text{ px}$
  - `price_scale`: $58 \times 496 = 28,768 \text{ px}$
  - `time_scale`: $570 \times 28 = 15,960 \text{ px}$
  - `corner_axis`: $58 \times 28 = 1,624 \text{ px}$
  - `legend_ohlc`: $394 \times 58 = 22,852 \text{ px}$
  - `bottom_timeframe_bar`: $628 \times 39 = 24,492 \text{ px}$

---

## 2. Detailed Findings by Interaction

```
+------------------------------------------------------------------------------------------------------+
| INTERACTION MATRIX SUMMARY                                                                           |
+-------------------+---------------------+-------------------------+----------------------------------+
| Interaction       | Primary Canvas Resp | Secondary Affected Area | Visible Changes                  |
+-------------------+---------------------+-------------------------+----------------------------------+
| 1. Crosshair Move | Canvas 1 (Overlay)  | Plot area only          | Reticle lines follow mouse       |
| 2. Mouse Exit     | Canvas 1 (Overlay)  | Plot area               | Reticle clears, crosshair hides  |
| 3. Horizontal Pan | Canvas 0, 1         | Time scale, Plot area   | Historical bars shift horizontally|
| 4. Wheel Zoom     | Canvas 0, 1, 4, 5   | Time scale, OHLC legend | Bar spacing expands/contracts    |
| 5. Time-Scale Zoom| Canvas 0, 1, 4, 5   | Time scale, Plot area   | Horizontal compression/expansion |
| 6. Price-Scale Zoom| Canvas 0, 1, 2, 3  | Price scale, Plot area  | Vertical compression/expansion   |
| 7. Chart Resizing | Canvases 0..5       | Canvas widths & heights | Canvas DOM attributes resize     |
| 8. Timeframe Switch| All Canvases       | Legend, Axis, Bar data  | Bar aggregation & range change   |
| 9. Chart Type Chg | Canvas 0 (Plot BG)  | Toolbar Icon            | Candlestick vs Bar presentation  |
+-------------------+---------------------+-------------------------+----------------------------------+
```

---

### 2.1 Interaction 1: Crosshair Movement

#### UI / Canvas Elements Involved
- `OBSERVATION`: Canvas 1 (`aria-label="Chart for BATS:AAPL, 1 day"`), Canvas 0 (`data-name="pane-canvas"`), Canvas 3 (Price Scale foreground), Canvas 5 (Time Scale foreground).

#### What Visibly Changes
- `OBSERVATION`: Moving the cursor from outside the plot into $(x=300, y=250)$ caused $10,218 \text{ px}$ ($3.61\%$) of the `plot_area` to mutate (`00_clean_baseline.png` vs `01_crosshair_at_300_250.png`).
- `OBSERVATION`: Moving the cursor from $(x=300, y=250)$ to $(x=450, y=320)$ caused $20,403 \text{ px}$ ($7.22\%$) of the `plot_area` to mutate (`01_crosshair_at_300_250.png` vs `01_crosshair_at_450_320.png`).
- `OBSERVATION`: The visible change consists of fine horizontal and vertical dashed reticle lines centered at the pointer coordinates.

#### Canvas Layers Responding
- `OBSERVATION`: The background candlesticks, grid lines, and Volume indicator histograms did not shift or redraw; only the top overlay canvas (Canvas 1) changed.
- `INFERENCE`: Crosshair rendering is isolated strictly to the interaction overlay layer (Canvas 1) to guarantee $60\text{ fps}$ tracking performance without invalidating the static historical series buffer on Canvas 0.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: The accessibility tree node (`role="Canvas"`, `node_id: 3`) preserved its name (`"Chart for BATS:AAPL, 1 day"`). No new DOM elements were added or removed during crosshair motion.
- `UNKNOWN`: The internal mouse move event throttle rate (e.g. `requestAnimationFrame` vs direct dispatch) cannot be determined without profiling JavaScript call stacks.

---

### 2.2 Interaction 2: Mouse Movement Over the Chart & Exit

#### UI / Canvas Elements Involved
- `OBSERVATION`: Canvas 1 (Plot overlay) and chart boundary container `DIV 1513`.

#### What Visibly Changes
- `OBSERVATION`: When the cursor was moved from inside the chart viewport $(x=450, y=320)$ outside to the top toolbar $(x=10, y=10)$, exactly $10,185 \text{ px}$ ($3.60\%$) of the `plot_area` changed (`01_crosshair_at_450_320.png` vs `02_mouse_exited_chart.png`).
- `OBSERVATION`: The crosshair reticle was completely erased from the plot area.
- `OBSERVATION`: The status line OHLC readout retained the last hovered bar's values (`O 346.09`, `H 347.82`, `L 340.46`, `C 343.46`).

#### Canvas Layers Responding
- `OBSERVATION`: Canvas 1 cleared its 2D buffer to complete transparency.
- `OBSERVATION`: Canvas 0 remained unaltered.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: No DOM element additions, deletions, or attribute mutations occurred.
- `INFERENCE`: Chart containers bind `mouseleave` or `pointerout` events on the top interaction canvas, invoking a `clearRect(0, 0, width, height)` pass on the overlay layer.
- `UNKNOWN`: Whether TradingView caches the last drawn reticle bounding box for partial dirty-rect clearing or executes a full canvas clear cannot be seen from external pixel evidence.

---

### 2.3 Interaction 3: Horizontal Panning

#### UI / Canvas Elements Involved
- `OBSERVATION`: Canvas 0 (Plot background), Canvas 1 (Plot interaction), Canvas 4 & 5 (Time Scale), Canvas 2 & 3 (Price Scale).

#### What Visibly Changes
- `OBSERVATION`: Dispatching a left-button mouse drag on the chart surface from $x=450$ to $x=200$ ($\Delta x = -250 \text{ px}$) produced $430 \text{ px}$ of direct candle displacement and time axis realignment (`03_pan_test_pre.png` vs `03_pan_test_post.png`).
- `OBSERVATION`: Candlesticks translated along the horizontal axis in lockstep with the drag vector.
- `OBSERVATION`: Timestamp labels along the bottom time scale shifted horizontally to reflect earlier dates scrolling into view from the left.

#### Canvas Layers Responding
- `OBSERVATION`: Canvas 0 (Plot background) and Canvas 4 (Time scale background) both re-rendered their series and tick marks.
- `OBSERVATION`: During drag execution, the crosshair reticle on Canvas 1 was suppressed or replaced by the active pan cursor state.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: Cursor CSS property transitioned from crosshair (`cursor: crosshair` or default) to grabbing (`cursor: grabbing` on active drag).
- `INFERENCE`: Panning translates the underlying horizontal index offset: $\text{Offset}_{new} = \text{Offset}_{old} + \frac{\Delta x}{\text{BarSpacing}}$.
- `UNKNOWN`: The internal buffer caching strategy for off-screen historical bars (e.g. how many bars are held in memory before a historical paginated network fetch is triggered) is not observable from UI evidence.

---

### 2.4 Interaction 4: Mouse-Wheel Zoom

#### UI / Canvas Elements Involved
- `OBSERVATION`: Canvas 0 (Plot background), Canvas 1 (Plot interaction), Canvas 4 & 5 (Time Scale), in-chart OHLC legend (`DIV 1518`), and bottom timeframe bar (`DIV 3832`).

#### What Visibly Changes
- `OBSERVATION`: Dispatching a mouse wheel zoom-out event (`deltaY: +300`) at $(x=300, y=280)$ produced significant regional mutations:
  - `plot_area`: $21,532 \text{ px}$ ($7.62\%$) changed.
  - `time_scale`: $1,307 \text{ px}$ ($8.19\%$) changed.
  - `legend_ohlc`: $6,441 \text{ px}$ ($28.19\%$) changed.
  - `bottom_timeframe_bar`: $1,194 \text{ px}$ ($4.88\%$) changed.
- `OBSERVATION`: Visible candle bar widths contracted (higher density of bars per horizontal inch).
- `OBSERVATION`: The time scale dynamically changed its tick interval granularity to accommodate a wider span of calendar dates.
- `OBSERVATION`: Price scale auto-scaling adjusted vertical bounds to encompass the newly visible high/low extremes.

#### Canvas Layers Responding
- `OBSERVATION`: Both Canvas 0 (candlesticks/volume) and Canvas 4 (time scale dates) completely redrew.
- `OBSERVATION`: Canvas 2 (price scale ticks) updated to reflect auto-scaled price boundaries.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: Active timeframe range tab indicator in `DIV 3832` changed styling as the custom zoomed range diverged from predefined presets.
- `INFERENCE`: Mouse-wheel zoom scales the horizontal bar spacing around the cursor's focal point $x_{anchor}$, preserving the timestamp directly beneath the mouse pointer.
- `UNKNOWN`: The exact mathematical zoom curve (geometric vs linear step factor per wheel notch) cannot be extracted without continuous event stream logging.

---

### 2.5 Interaction 5: Time-Scale Zoom

#### UI / Canvas Elements Involved
- `OBSERVATION`: Canvas 4 & 5 (Time scale $y \in [538, 566]$), Canvas 0 & 1 (Plot area).

#### What Visibly Changes
- `OBSERVATION`: Horizontal mouse dragging along the time scale strip ($y=550$, $\Delta x = -150 \text{ px}$) triggered horizontal candle compression.
- `OBSERVATION`: The time scale's visible tick mark density increased as more dates compressed into the horizontal viewport.
- `OBSERVATION`: The vertical price scale remained locked in relative proportion while auto-fitting to the newly encompassed price domain.

#### Canvas Layers Responding
- `OBSERVATION`: Canvas 4 (time scale ticks) and Canvas 0 (plot series) redrew.
- `OBSERVATION`: Canvas 2 (price scale) adjusted bounds if the newly revealed candles set a new period high or low.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: Hovering the time scale changed the cursor style to an East-West resize cursor (`col-resize` / bidirectional horizontal arrow).
- `INFERENCE`: Dragging on the time scale acts as an isolated horizontal zoom controller: dragging right increases bar spacing (zooms in), while dragging left decreases bar spacing (zooms out).
- `UNKNOWN`: The sensitivity ratio ($\Delta \text{BarSpacing} / \Delta x_{drag}$) cannot be calculated with absolute precision without analog touch/pointer telemetry.

---

### 2.6 Interaction 6: Price-Scale Zoom

#### UI / Canvas Elements Involved
- `OBSERVATION`: Canvas 2 & 3 (Price scale $x \in [626, 684]$), Canvas 0 & 1 (Plot area), in-chart legend.

#### What Visibly Changes
- `OBSERVATION`: Vertical mouse dragging along the price scale strip ($x=650$, $\Delta y = -150 \text{ px}$) produced dramatic vertical stretching across the chart:
  - `plot_area`: $33,343 \text{ px}$ ($11.79\%$) changed.
  - `price_scale`: $6,138 \text{ px}$ ($21.34\%$) changed.
  - `time_scale`: $1,168 \text{ px}$ ($7.32\%$) changed.
  - `legend_ohlc`: $2,213 \text{ px}$ ($9.68\%$) changed.
  - `bottom_timeframe_bar`: $1,382 \text{ px}$ ($5.64\%$) changed.
- `OBSERVATION`: Candlestick heights stretched vertically, expanding the spacing between price grid lines.
- `OBSERVATION`: The price scale tick numbers re-spaced, decreasing the numerical price difference between adjacent horizontal lines.

#### Canvas Layers Responding
- `OBSERVATION`: Canvas 2 (Price scale background) redrew tick labels with new vertical coordinate offsets.
- `OBSERVATION`: Canvas 0 (Plot background) re-rendered all candlesticks using the new vertical price transformation: $y_{pixel} = H_{plot} \times \frac{Price_{max} - Price}{Price_{max} - Price_{min}}$.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: Hovering the price scale displayed a North-South resize cursor (`row-resize` / bidirectional vertical arrow).
- `OBSERVATION`: A small "Auto" / reset button became active in the lower corner of the price scale, indicating that default automatic vertical scaling had been overridden by manual user scaling.
- `INFERENCE`: Manual dragging on the price scale disengages auto-scaling and switches the price coordinate engine to fixed-range manual zoom mode.
- `UNKNOWN`: The threshold or double-click gesture logic used to snap the scale back to automatic scaling is not observable from single-pass drag tests.

---

### 2.7 Interaction 7: Chart Resizing

#### UI / Canvas Elements Involved
- `OBSERVATION`: All 7 chart canvas elements (`Nodes 1792, 1793, 1836, 1837, 1870, 1871, 1874`).

#### What Visibly Changes
- `OBSERVATION`: When the browser viewport was resized from $1034 \times 605 \text{ px}$ to $1280 \times 720 \text{ px}$ via CDP `Emulation.setDeviceMetricsOverride`, total screenshot payload increased from $92,821 \text{ bytes}$ to $119,919 \text{ bytes}$ (`07_resize_pre.png` vs `07_resize_1280x720.png`).
- `OBSERVATION`: The chart surface expanded to fill the wider and taller viewport.

#### Canvas Layers Responding (Exact Dimension Transitions)
- `OBSERVATION`: Canvas element DOM attributes (`width` and `height`) dynamically resized across the entire canvas stack:
  - **Canvas 0 (Plot background)**: $570 \times 496 \text{ px} \longrightarrow \mathbf{816 \times 611 \text{ px}}$ ($\Delta W = +246\text{ px}, \Delta H = +115\text{ px}$).
  - **Canvas 1 (Plot interaction)**: $570 \times 496 \text{ px} \longrightarrow \mathbf{816 \times 611 \text{ px}}$.
  - **Canvas 2 (Price scale background)**: $58 \times 496 \text{ px} \longrightarrow \mathbf{58 \times 611 \text{ px}}$ (Width remained fixed at $58\text{ px}$; Height expanded $+115\text{ px}$).
  - **Canvas 3 (Price scale interaction)**: $58 \times 496 \text{ px} \longrightarrow \mathbf{58 \times 611 \text{ px}}$.
  - **Canvas 4 & 5 (Time scale)**: $570 \times 28 \text{ px} \longrightarrow \mathbf{816 \times 28 \text{ px}}$ (Width expanded $+246\text{ px}$; Height remained fixed at $28\text{ px}$).
  - **Canvas 6 (Corner)**: Remained fixed at $\mathbf{58 \times 28 \text{ px}}$.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: Canvas DOM attributes `width` and `height` updated in real time via JavaScript ResizeObserver.
- `INFERENCE`: TradingView recalculates the visible candle count to fill the newly available horizontal pixels, rather than stretching existing rendered pixels like an image.
- `UNKNOWN`: The internal debounce interval (if any) applied to `ResizeObserver` callbacks during continuous window dragging cannot be measured from a single discrete resize step.

---

### 2.8 Interaction 8: Switching the Visible Timeframe

#### UI / Canvas Elements Involved
- `OBSERVATION`: Bottom range preset buttons (`data-name="date-range-tab-5D"`, `date-range-tab-1M"`, `date-range-tab-1D"` in `DIV 3832`), Canvas 0..5, in-chart legend (`DIV 1518`), and top bar interval button (`BUTTON 78`).

#### What Visibly Changes
- `OBSERVATION`: Clicking `5D` produced extensive regional updates:
  - `plot_area`: $26,925 \text{ px}$ ($9.52\%$) changed.
  - `price_scale`: $6,137 \text{ px}$ ($21.33\%$) changed.
  - `time_scale`: $700 \text{ px}$ ($4.39\%$) changed.
  - `legend_ohlc`: $3,409 \text{ px}$ ($14.92\%$) changed.
  - `bottom_timeframe_bar`: $1,542 \text{ px}$ ($6.3\%$) changed.
- `OBSERVATION`: Candlesticks re-rendered into 5-minute interval bars covering the past 5 trading days.
- `OBSERVATION`: Top interval selector updated from `'1D'` (1 day) to `'5m'` (5 minutes).
- `OBSERVATION`: Clicking `'1M'` updated the display to 30-minute interval bars covering the past 30 days (`plot_area` changed $7.14\%$, `price_scale` changed $5.78\%$, `legend_ohlc` changed $25.43\%$).

#### Canvas Layers Responding
- `OBSERVATION`: All canvases (Plot, Price Scale, Time Scale) cleared and redrew with the new dataset.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: The active button in `DIV 3832` received active class and `aria-checked="true"`.
- `OBSERVATION`: Status line in `DIV 1518` updated interval text (e.g. `'5m'` or `'30m'`).
- `INFERENCE`: Clicking a range preset triggers a composite action: (1) calculate target time span, (2) select optimal bar aggregation resolution, (3) request/filter historical bar array, and (4) execute complete chart recalculation and redraw.
- `UNKNOWN`: The client-side caching mechanism for multi-resolution bar data (whether 5-minute bars are pre-fetched or retrieved on demand via WebSocket) was obscured because network bodies were policy-filtered.

---

### 2.9 Interaction 9: Changing Chart Type (Candles to Bars)

#### UI / Canvas Elements Involved
- `OBSERVATION`: Top Toolbar button `#header-toolbar-chart-styles button`, Chart Styles Dropdown Menu (`class="menuWrap-lBIxIwtz"`), Canvas 0 (Plot background), Canvas 1 (Plot interaction).

#### What Visibly Changes
- `OBSERVATION`: Dispatching `mousedown` + `mouseup` + `click` on `#header-toolbar-chart-styles button` opened a high-z-index popover menu displaying 11 chart series styles:
  1. `Bars`
  2. `Candles`
  3. `Hollow candles`
  4. `Volume candles`
  5. `Line`
  6. `Line with markers`
  7. `Step line`
  8. `Area`
  9. `HLC area`
  10. `Baseline`
  11. `Columns`
- `OBSERVATION`: Selecting `'Bars'` closed the menu and updated the chart:
  - `plot_area`: $545 \text{ px}$ ($0.19\%$) changed (`09_type_pre.png` vs `09_type_changed_new_style.png`).
  - Solid rectangular candlestick bodies were replaced with traditional OHLC tick bars (thin vertical bar with left horizontal tick for Open and right horizontal tick for Close).
  - `#header-toolbar-chart-styles button` icon updated its SVG glyph from a Candlestick symbol to a Bar symbol.
- `OBSERVATION`: Selecting `'Candles'` again restored the original filled candlestick display (`09_type_reverted_candles.png`).

#### Canvas Layers Responding
- `OBSERVATION`: Canvas 0 (Plot background) re-executed its rendering loop using the Bar renderer instead of the Candle renderer.
- `OBSERVATION`: Canvas 2 (Price scale) and Canvas 4 (Time scale) remained unchanged in scale and tick values.

#### Observable DOM / Accessibility Changes
- `OBSERVATION`: Button `#header-toolbar-chart-styles button` updated its `aria-label` and `data-tooltip` from `"Candles"` to `"Bars"` and back.
- `INFERENCE`: The charting engine decouples the time series data source from the visual series renderer. Switching the chart style changes only the rendering delegate function (drawCandle vs drawBar vs drawLine) without altering price coordinates or bar timestamps.
- `UNKNOWN`: The internal shaders or drawing primitive batching used by the series renderer cannot be observed from external DOM inspection.

---

## 3. Synthesis & Strategic Guidance for Our Engine

### 3.1 What Interactions Are Confirmed
1. **Separation of Interaction and Data Layers**: Proven by regional pixel analysis and canvas dimension tracking. The static chart data (grid, candlesticks, axes text) lives on background layers, while high-frequency user interactions (crosshair, hover reticle, tracking badges) live on transparent overlay canvases.
2. **Independent Axis Manipulation**: Dragging the Price Scale alters only vertical price coordinate mapping; dragging the Time Scale alters only horizontal bar spacing.
3. **Elastic Multi-Canvas Geometry**: Canvas widths and heights are strictly synchronized via `ResizeObserver` according to explicit formulaic relationships:
   $$\text{Width}_{\text{plot}} = \text{Width}_{\text{viewport}} - \text{Width}_{\text{left\_toolbar}} - \text{Width}_{\text{price\_scale}} - \text{Width}_{\text{right\_dock}}$$
   $$\text{Height}_{\text{plot}} = \text{Height}_{\text{viewport}} - \text{Height}_{\text{top\_toolbar}} - \text{Height}_{\text{time\_scale}} - \text{Height}_{\text{bottom\_bar}}$$
4. **Style Delegate Swapping**: Changing chart types updates only the plot series renderer and toolbar button icon without modifying scale boundaries.

### 3.2 What Coordinate Behavior Can Be Inferred
- **Horizontal Coordinate (Time Domain)**:
  - Linear index-based projection: $X(i) = \text{Origin}_X + i \times \text{BarSpacing}$.
  - Zooming modifies $\text{BarSpacing}$ around the cursor anchor.
  - Panning offsets $\text{Origin}_X$.
- **Vertical Coordinate (Price Domain)**:
  - Linear affine transformation: $Y(P) = \text{Height}_{\text{plot}} \times \frac{P_{\text{max}} - P}{P_{\text{max}} - P_{\text{min}}}$.
  - Auto-scale dynamically computes $P_{\text{min}}$ and $P_{\text{max}}$ from the subset of bars currently visible between $X=0$ and $X=\text{Width}_{\text{plot}}$.
  - Price scale drag introduces a manual vertical zoom factor $\sigma_y$ and offset $\Delta y$, overriding auto-scale.

### 3.3 What Remains Unknown
- The exact touch-gesture handling routines and multi-touch pinch-zoom formulas.
- The precise collision detection algorithm used to detect hover over individual candle bodies vs drawing vector anchors.
- The binary/JSON protocol used to stream incremental real-time price updates into active canvas buffers.

### 3.4 What We Should Implement First in Our Own Chart Engine
To build an independent, high-performance TradingView clone, we should implement components in this prioritized order:

1. **Dual-Canvas Surface Shell**:
   - Create a container with two stacked canvases for the plot area (Background + Interactive Overlay) and single/dual canvases for the Price Scale and Time Scale.
   - Implement `ResizeObserver` to sync canvas pixel buffer sizes with layout dimensions ($DPR \times \text{BoundingRect}$).
2. **Coordinate & Scale Transformer**:
   - Implement the `TimeScale` class: managing `barSpacing`, `visibleRange`, timestamp-to-X mapping, and date label formatting.
   - Implement the `PriceScale` class: managing `priceRange`, auto-scale calculation from visible bars, and price-to-Y mapping.
3. **Crosshair & Overlay Event Controller**:
   - Attach `pointermove` and `pointerleave` listeners to the top interaction canvas.
   - On move: calculate nearest bar index $i$ and interpolated price $P$, render dashed reticle lines on the plot overlay canvas, and render synchronized price/date badges on the axis overlay canvases.
   - On leave: invoke `clearRect` on overlay canvases.
4. **Pan & Mouse-Wheel Zoom Gestures**:
   - `wheel` event handler: adjust `barSpacing` relative to pointer position.
   - `pointerdown` + `pointermove` + `pointerup` handlers: adjust horizontal bar offset during drag.
5. **Pluggable Series Renderers**:
   - Design an abstract `SeriesRenderer` interface with `drawCandles()`, `drawBars()`, and `drawLine()` implementations, enabling one-click style switching identical to TradingView.
