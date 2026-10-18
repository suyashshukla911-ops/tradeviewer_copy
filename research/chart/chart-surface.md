# TradingView Chart Surface Reverse-Engineering Analysis

> **Evidence Source**: `D:\TradingViewClone\rea-workspace\evidence\tradingview-workspace.json`  
> **Target Component**: Main Chart Region (`DIV 1510` / Accessibility Node `172: Chart #1`)  
> **Predicate**: `rea.web-page-inspection` (`inspect_web_page`)  
> **Document Status**: Purely observational reverse-engineering analysis. No application code or dependencies modified.

---

## 1. Chart Container Architecture

### 1.1 DOM Hierarchy & Nesting
- `OBSERVATION`: The main chart area is encapsulated inside top-level container `<DIV>` (DOM Node `1510`, attributes: `class`, `style`).
- `OBSERVATION`: Node `1510` nests through structural wrappers:
  - `<DIV>` (DOM Node `1511`, attributes: `class`, `data-qa-id`, `style`)
  - `<DIV>` (DOM Node `1512`, attributes: `class`)
  - `<DIV>` (DOM Node `1513`, attributes: `class`, `role`, `aria-label`, `style`) -> Corresponds to Accessibility Node `172`: `role='region'`, `name='Chart #1'`.
- `OBSERVATION`: Within chart container `DIV 1513`, layout is split across primary sections:
  1. `<DIV>` (DOM Node `1514`, attribute: `class`): Header / boundary element.
  2. `<DIV>` (DOM Node `1515`, attributes: `class`, `style`): Core chart plotting & scale grid.
     - Sub-container `<DIV>` (DOM Node `1516`, attribute: `style`): Holds the main plot canvas pair and the right-side price scale container.
     - Sub-container `<DIV>` (DOM Node `1866`, attribute: `style`): Holds the bottom time scale canvas pair and the corner axis intersection.
  3. `<DIV>` (DOM Node `1875`, attribute: `class`): In-chart overlay container.
  4. `<DIV>` (DOM Node `1876`, attribute: `class`): In-chart floating button cluster container (contains tool buttons `1877` and `1903`).
  5. `<DIV>` (DOM Node `1909`, attributes: `class`, `role`): Layout sibling wrapper.
  6. `<DIV>` (DOM Node `1914`, attributes: `class`, `data-is-chart-toolbar-component`, `style`, `data-initialized`): Floating chart toolbar component.
- `INFERENCE`: TradingView arranges the chart surface as a composite viewport where the 2D plot area and the surrounding price/time coordinate axes are separate DOM containers aligned via CSS layout (flex or absolute grid), allowing axes to be resized, hidden, or panned independently.
- `UNKNOWN`: The exact CSS positioning properties (`position: absolute`, `display: flex`, or `display: grid`) and exact pixel bounds are not directly retrievable because inline style values were redacted in REA capture.

---

## 2. Canvas & SVG Elements in Chart Surface

```
+-------------------------------------------------------------------------------+--------------+
| Status Line / Legend (DIV 1518): Symbol | Interval | Market | OHLC            |              |
| Instant Execution Widget: Sell (343.46) | Spread (0.00) | Buy (343.46)        | Price Scale  |
| Indicator Legend: Volume (59.95M)                                             | (DIV 1834):  |
|                                                                               | - Canvas 1836|
| Main Plot Area (DIV 1518):                                                    | - Canvas 1837|
| - Layer 1 (Canvas 1792): Static/Background (data-name, aria-hidden)           | - Scale Tools|
| - Layer 2 (Canvas 1793): Interactive/Overlay (data-qa-id, aria-label)         |   (Buttons   |
| - Overlay Tool Cluster (DIV 1794): 7 SVG tools + ellipsis menu                |   1861, 1864)|
| - In-Chart Floating Toolbar (DIV 1914: data-is-chart-toolbar-component)       |              |
+-------------------------------------------------------------------------------+--------------+
| Time Scale (DIV 1866):                                                        | Corner Axis  |
| - Layer 1 (Canvas 1870): Static/Dates                                         | (Canvas 1874)|
| - Layer 2 (Canvas 1871): Interactive/Cursor Badge                             |              |
+-------------------------------------------------------------------------------+--------------+
| Timeframe Bar (DIV 3832): 1D | 5D | 1M | 3M | 6M | YTD | 1Y | 5Y | All | Go To | Timezone | ADJ  |
+----------------------------------------------------------------------------------------------+
```

### 2.1 Complete Canvas Inventory (7 Canvases)
- `OBSERVATION`: Exactly 7 `<canvas>` elements exist within the main chart surface hierarchy (`DIV 1510`):
  1. **Plot Area Layer 1 (Node `1792`)**:
     - Parent: `DIV 1518` (path: `1516 -> 1518 -> 1792`).
     - Attributes: `['data-name', 'aria-hidden', 'width', 'height', 'style']`.
     - Role: Background plot canvas.
  2. **Plot Area Layer 2 (Node `1793`)**:
     - Parent: `DIV 1518` (path: `1516 -> 1518 -> 1793`).
     - Attributes: `['data-qa-id', 'aria-label', 'width', 'height', 'style']`.
     - Accessibility Mapping: Accessibility Node `3` (`role='Canvas'`, `name='Chart for BATS:AAPL, 1 day'`).
     - Role: Interactive overlay plot canvas.
  3. **Price Scale Layer 1 (Node `1836`)**:
     - Parent: `DIV 1835` (path: `1516 -> 1834 -> 1835 -> 1836`).
     - Attributes: `['width', 'height', 'style']`.
     - Role: Price scale tick labels & grid lines background canvas.
  4. **Price Scale Layer 2 (Node `1837`)**:
     - Parent: `DIV 1835` (path: `1516 -> 1834 -> 1835 -> 1837`).
     - Attributes: `['width', 'height', 'style']`.
     - Role: Price scale cursor badge & active highlight interactive canvas.
  5. **Time Scale Layer 1 (Node `1870`)**:
     - Parent: `DIV 1869` (path: `1866 -> 1868 -> 1869 -> 1870`).
     - Attributes: `['width', 'height', 'style']`.
     - Role: Time scale tick labels & dates background canvas.
  6. **Time Scale Layer 2 (Node `1871`)**:
     - Parent: `DIV 1869` (path: `1866 -> 1868 -> 1869 -> 1871`).
     - Attributes: `['width', 'height', 'style']`.
     - Role: Time scale cursor badge & active highlight interactive canvas.
  7. **Corner Axis Intersection (Node `1874`)**:
     - Parent: `DIV 1873` (path: `1866 -> 1872 -> 1873 -> 1874`).
     - Attributes: `['width', 'height', 'style']`.
     - Role: Corner junction canvas where X and Y axes intersect.
- `INFERENCE`: The chart surface utilizes a 2-layer stacked canvas architecture for every primary visual component (Plot, Price Scale, Time Scale). Layer 1 renders heavy, infrequently changing data (grid, candlesticks, indicator paths, static axis labels). Layer 2 renders dynamic, high-frequency interaction elements (crosshair lines, cursor tracking badges, tooltip markers) on top. This avoids expensive re-rendering of historical data series on every mouse movement.
- `UNKNOWN`: The internal graphics API (`CanvasRenderingContext2D` vs `WebGL` vs `WebGL2`) and the device pixel ratio scaling factor cannot be determined from DOM attribute names alone.

### 2.2 SVG Elements in Chart Surface
- `OBSERVATION`: SVG elements in the chart surface are restricted to iconography for controls and buttons:
  - **Legend Action Buttons**: 6 SVGs in `DIV 1728` (`BUTTON 1729, 1744, 1758, 1763, 1767, 1772`).
  - **In-Plot Overlay Controls (`DIV 1794`)**:
    - 7 tool action SVGs (`DIV 1796, 1800, 1804, 1808, 1813, 1818, 1823`).
    - 1 ellipsis icon (`DIV 1828` containing SVG `1830` with three `<circle>` elements at `1831, 1832, 1833`).
  - **Price Scale Controls**: SVGs inside `DIV 1840, 1848, 1853`.
  - **On-Chart Action Buttons (`DIV 1876`)**:
    - SVGs in `DIV 1877` (`DIV 1880, 1884, 1890, 1894, 1899` with hotkeys).
    - SVGs in `DIV 1903` (`DIV 1904` with hotkeys).
- `INFERENCE`: TradingView never renders financial chart series or trendlines as DOM SVG nodes; SVG is strictly reserved for UI chrome icons, overlays, and toolbar buttons.

---

## 3. Visible Axes & Coordinate System

### 3.1 Geometric Coordinate Layout
- `OBSERVATION`: The chart surface coordinate space is divided into:
  - **Central Viewport (Plot Area)**: Housed in `DIV 1518`. Contains Candlesticks, Grid lines, Study plots (Volume), and Drawings.
  - **Vertical Axis (Price Scale / Y-Axis)**: Housed in `DIV 1834` (direct right sibling of `DIV 1518`).
  - **Horizontal Axis (Time Scale / X-Axis)**: Housed in `DIV 1866` (direct bottom sibling of `DIV 1516`).
  - **Corner Junction**: Housed in `DIV 1872` (bottom-right corner where Y-axis and X-axis intersect).
- `INFERENCE`: The coordinate system maps timestamp/bar index to the X-axis (time scale) and price value to the Y-axis (price scale). The plot canvas dimensions match the product of the visible time domain and price range.
- `UNKNOWN`: The exact mathematical projection formula (e.g. linear vs logarithmic scale transformations, percentage change scale) cannot be inspected from the static snapshot.

---

## 4. Price Scale (Y-Axis)

### 4.1 Structural Composition
- `OBSERVATION`: Price scale container is `<DIV>` (DOM Node `1834`, attributes: `class`, `style`), containing `<DIV>` (DOM Node `1835`, attributes: `class`, `data-name`, `aria-hidden`, `style`).
- `OBSERVATION`: Houses two canvas elements:
  - `CANVAS 1836`: Background scale layer (price ticks, grid label text).
  - `CANVAS 1837`: Foreground scale layer (active cursor price badge, market price badge).
- `OBSERVATION`: Contains scale utility buttons and status flags:
  - `DIV 1838` (attribute: `data-name`): Status badges and currency flags (`DIV 1840, 1848, 1853` with vector glyphs).
  - `DIV 1858` (attribute: `style`): Scale action buttons:
    - `BUTTON 1861`: attributes `class`, `data-tooltip`, `aria-label`.
    - `BUTTON 1864`: attributes `class`, `data-tooltip`, `aria-label`.
- `OBSERVATION`: Price scale readouts observed in the chart status line and badges:
  - Current Price: `343.46`
  - Open: `346.09`
  - High: `347.82`
  - Low: `340.46`
  - Close: `343.46`
  - Change: `+1.46 (+0.43%)`
  - Spread: `0.00`
  - Buy Price: `343.46`
  - Sell Price: `343.46`
- `INFERENCE`: Buttons `1861` and `1864` correspond to the standard TradingView price scale toggles (e.g. `Auto` / `Log` / `Percentage` / `Regular` scale modes).
- `UNKNOWN`: The frequency and protocol of real-time price tick updates (e.g. WebSocket payload format) cannot be observed because WebSocket body capture was policy-filtered.

---

## 5. Time Scale (X-Axis)

### 5.1 Structural Composition
- `OBSERVATION`: Time scale container is `<DIV>` (DOM Node `1866`, attribute: `style`), which branches into:
  - `DIV 1868` (attributes: `class`, `style`): Time scale canvas container.
  - `DIV 1872` (attributes: `class`, `style`): Corner intersection container.
- `OBSERVATION`: Time scale canvas container `DIV 1868` holds `<DIV>` (DOM Node `1869`, attributes: `aria-hidden`, `style`), which contains:
  - `CANVAS 1870`: Background time scale layer (date/time tick labels and separator marks).
  - `CANVAS 1871`: Foreground time scale layer (cursor timestamp badge).
- `OBSERVATION`: Corner container `DIV 1872` contains `DIV 1873` and `CANVAS 1874` (`width`, `height`, `style`).
- `OBSERVATION`: Adjacent to the time scale is the bottom range preset bar (`DIV 3832` / Accessibility Node `207` / `2134`):
  - Presets: `1D` (Button 2146), `5D` (Button 2149), `1M` (Button 2152), `3M` (Button 2155), `6M` (Button 2158), `YTD` (Button 2161), `1Y` (Button 2164), `5Y` (Button 2167), `All` (Button 2170).
  - Date Jump: Button `209` (`Go to`).
  - Timezone: Button `211` (`Timezone`, displaying `'04:55:53 UTC'`).
  - Dividend adjustment toggle: Button `213` (`Adjust data for dividends`, label `'ADJ'`, state `pressed`).
- `INFERENCE`: The time scale canvas renders date/time strings corresponding to candle timestamps. When the user zooms or pans, the time scale recalculates label granularity (e.g. minutes -> hours -> days -> months) based on viewport bar spacing.
- `UNKNOWN`: The internal indexing scheme (e.g. zero-based bar index vs epoch milliseconds array) used to align multi-timeframe candles on the X-axis is not observable in UI evidence.

---

## 6. Visible Chart Controls & Overlays

### 6.1 Status Line / In-Chart Legend (`DIV 1518` / Acc `1795`)
- `OBSERVATION`: Rendered in the top-left corner of the chart plot area:
  - **Symbol Identification**:
    - Vector logo icon (`Node 1806`).
    - Letter badge `'A'` (Node `174`).
    - Button `175`: `name='Change symbol'`, text `'Apple Inc'`.
    - Bullet separator `'·'`.
    - Button `177`: `name='Change interval'`, text `'1D'`.
    - Bullet separator `'·'`.
    - Exchange label: `'NASDAQ'` (Node `179`).
  - **Symbol Actions**:
    - Button `180`: `name='Flag symbol'`.
    - Button `182`: `name='More'`, `desc='More'`.
  - **Market Status Banner**:
    - Button `1845`: `name='Market closed · One update every 5 seconds · NASDAQ by Cboe One'`.
  - **OHLC Display**:
    - `'O'` `346.09`
    - `'H'` `347.82`
    - `'L'` `340.46`
    - `'C'` `343.46`
    - Change: `'+1.46 (+0.43%)'`
- `INFERENCE`: The status line provides immediate context on the active series, showing the OHLC values of the latest bar or the bar currently hovered by the crosshair.

### 6.2 Instant Execution Widget (Trading Buttons)
- `OBSERVATION`: Positioned directly below the status line in `DIV 1893`:
  - **Sell Button**: Node `1904` (text `'SELL'`, price `343.46` at Node `198`).
  - **Spread Badge**: Node `1906` (`desc='Spread'`, value `'0.00'` at Node `1907`).
  - **Buy Button**: Node `1918` (text `'BUY'`, price `343.46` at Node `199`).
- `INFERENCE`: This widget allows one-click order placement directly from the chart surface when connected to a brokerage or paper trading account.

### 6.3 Indicator Legend (Volume Study)
- `OBSERVATION`: Positioned beneath the instant execution widget:
  - Button `1930`: `name='Hide indicator legend'`, `desc='Hide indicator legend'`.
  - Toolbar `1955`:
    - Label: `'Vol'` (Node `1960`).
    - Quick actions: Button `1963` (`Hide`), Button `1992` (`Settings`), Button `2001` (`Remove`), Button `2006` (`More`).
    - Value: `'59.95 M'` (Node `2017`).
- `INFERENCE`: Secondary indicators (such as Volume, Moving Averages, MACD) render their own collapsible legend row with dedicated visibility, configuration, and removal controls.

### 6.4 In-Chart Floating Toolbar (`DIV 1914`)
- `OBSERVATION`: Container `DIV 1914` bears the attribute `data-is-chart-toolbar-component` along with `data-initialized` and inline styles.
- `OBSERVATION`: Contains button elements with `data-tooltip`, `data-tooltip-hotkey`, `data-name`, `aria-label`, `aria-haspopup`, and focus management `data-mouse-click-auto-blur`.
- `INFERENCE`: This component represents an in-chart context toolbar (e.g. drawing properties toolbar or quick favorite tools bar) floating above the canvas.

---

## 7. Crosshair-Related Observable Elements

- `OBSERVATION`: The term "crosshair" does not exist as an independent DOM element or accessibility role in the evidence.
- `OBSERVATION`: In Left Toolbar (`DIV 1310`), Button `118` is named `Cross` and is paired with Button `120` (`Cursors`, state `pressed`).
- `OBSERVATION`: Paired canvas elements exist for the main plot (`1792` + `1793`), price scale (`1836` + `1837`), and time scale (`1870` + `1871`).
- `INFERENCE`: The crosshair is not rendered with HTML/DOM lines or SVG paths; it is drawn dynamically onto the overlay canvas layers (`1793`, `1837`, `1871`) in response to mouse pointer events.
- `INFERENCE`: The crosshair synchronizes three visual elements simultaneously:
  1. Perpendicular dashed/dotted lines on Plot Canvas `1793`.
  2. Current price badge on Price Scale Canvas `1837`.
  3. Current timestamp/bar date badge on Time Scale Canvas `1871`.
- `UNKNOWN`: The exact line dash pattern, color palette, and crosshair snapping logic (snap to OHLC vs free-floating) cannot be directly determined without interactive mouse movement trace events.

---

## 8. Drawing-Related Observable Elements

- `OBSERVATION`: Left Toolbar (`DIV 1310` / Acc Node `1641`) contains 27 controls explicitly related to drawing and annotation:
  - Cursors / Crosshair: `Cross` (118), `Cursors` (120).
  - Lines: `Trendline` (122), `Trend tools` (124).
  - Fib & Gann: `Fib retracement` (126), `Gann and Fibonacci tools` (128).
  - Patterns: `XABCD pattern` (130), `Patterns` (132).
  - Positions & Measurement: `Long position` (134), `Forecasting and measurement tools` (136).
  - Freehand & Shapes: `Brush` (138), `Geometric shapes` (140).
  - Text: `Text` (142), `Annotation tools` (144).
  - Icons: `Icon` (146), `Icons` (148).
  - Measurement Utility: `Measure` (150).
  - Zoom: `Zoom in` (152).
  - Snapping: `Magnet mode snaps drawings placed near price bars to the closest OHLC value` (154), `Magnets` (156).
  - Drawing State: `Keep drawing` (158).
  - Locking: `Lock drawings and indicators` (160), `Lock options` (162).
  - Visibility: `Hide all drawings` (164), `Hide options` (166).
  - Deletion: `Remove objects` (168), `Remove options` (170).
- `OBSERVATION`: In-chart DOM container `1914` contains attribute `data-is-chart-toolbar-component`.
- `INFERENCE`: User drawings (trendlines, Fibonacci retracements, shapes) are rendered directly onto the chart canvas rather than as separate DOM elements. When a drawing is selected, the floating toolbar (`DIV 1914`) displays color, line width, and style customization controls.
- `UNKNOWN`: The internal data structure representing drawing anchors, coordinate transformations, and serialization schemas cannot be inspected from the static snapshot.

---

## 9. Other Chart-Specific Structures

### 9.1 Div-Based Main Chart vs Table-Based Mini-Charts
- `OBSERVATION`: The primary interactive chart surface (`DIV 1510`) uses nested `DIV` containers with CSS styles for positioning its 7 canvases and overlay controls.
- `OBSERVATION`: In contrast, the secondary sparkline/mini-charts in the right-side watchlist/details panel (`DIV 1972`) use HTML `TABLE` structures (`Node 3497` and `Node 3701`, with attributes `cellspacing`, `style`).
- `INFERENCE`: TradingView distinguishes between the primary interactive chart (which requires multi-layer canvas stacking, pointer event listeners, and flexible viewport resizing) and auxiliary widget sparklines (which use simple tabular layouts for alignment within informational cards).
- `UNKNOWN`: The minimum hardware acceleration or WebGL fallback requirements for running multiple charts concurrently on a single page are not recorded in the evidence.
