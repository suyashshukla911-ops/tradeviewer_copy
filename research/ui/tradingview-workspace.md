# TradingView Workspace UI Architecture Analysis

> **Evidence Source**: `D:\TradingViewClone\rea-workspace\evidence\tradingview-workspace.json`  
> **Predicate Type**: `rea.web-page-inspection` (`inspect_web_page`)  
> **Target URL**: `https://www.tradingview.com/chart/`  
> **Capture Timestamp**: `2026-10-18T04:55:47.939Z` to `2026-10-18T04:55:51.855Z` (2000 ms observation)  
> **Document Status**: Purely observational reverse-engineering analysis. No application code or dependencies modified.

---

## 1. Evidence & Capture Context

- `OBSERVATION`: The inspection was performed using Chrome `155.0.8059.80` on Windows (`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36`) connected via Chrome DevTools Protocol (CDP v1.3).
- `OBSERVATION`: The target page title was observed as `AAPL 343.46 ▲ +0.43%` on origin `https://www.tradingview.com`.
- `OBSERVATION`: The DOM inspection captured a total of 4,203 DOM nodes (`total_nodes: 4203`).
- `OBSERVATION`: The Accessibility Tree inspection captured 2,035 accessibility nodes (`total_nodes: 2035`), including 700 non-ignored named accessible nodes and 103 accessible button elements.
- `OBSERVATION`: Inspection policy was configured with `allowed_origins: ["https://www.tradingview.com"]`, `include_accessibility_text: true`, `include_console_text: false`, `include_json_body_shapes: false`, `include_websocket_shapes: false`, `include_storage_keys: false`, `include_script_sources: false`.
- `INFERENCE`: The page snapshot represents an authenticated or unauthenticated default guest workspace viewing a daily chart for Apple Inc (`NASDAQ:AAPL` / `BATS:AAPL`) with the default right-hand watchlist panel open.
- `UNKNOWN`: The user account ID, authentication token, and tier status are not present in the evidence because storage values and headers were redacted/omitted by policy.

---

## 2. High-Level Page Structure & Root Containers

- `OBSERVATION`: The document hierarchy originates at `#document` (DOM Node 0, `node_type: 9`), leading to `<HTML>` (DOM Node 2, attributes: `lang`, `dir`, `class`, `data-theme`) and `<BODY>` (DOM Node 744, attribute: `class`).
- `OBSERVATION`: The primary application mount point is `<DIV>` (DOM Node 746, attributes: `class`, `style`), which contains a wrapper `<DIV>` (DOM Node 747, attributes: `data-qa-id`, `class`, `style`).
- `OBSERVATION`: Workspace root container `DIV 747` directly branches into 9 top-level functional children:
  1. `DIV 748`: Empty layout spacer (1 DOM node).
  2. `DIV 749`: Action trigger containing a `<BUTTON>` with `data-qa-id` and SVG icon (10 DOM nodes).
  3. `DIV 759`: Top Toolbar container (551 DOM nodes, maps to Accessibility Node 1188).
  4. `DIV 1310`: Left Drawing Toolbar container (200 DOM nodes, maps to Accessibility Node 1641).
  5. `DIV 1510`: Main Chart Region container (462 DOM nodes, maps to Accessibility Node 1785).
  6. `DIV 1972`: Right-Side Region containing sidebar dock and open watchlist/details panel (1,860 DOM nodes, maps to Accessibility Node 2183).
  7. `DIV 3832`: Bottom Timeframe & Date Preset Bar container (24 DOM nodes, maps to Accessibility Node 207 / 2134).
  8. `DIV 3856`: Bottom Dock / Trading Panel container (6 DOM nodes, maps to Accessibility Node 333).
  9. `DIV 3862`: Layout boundary element (1 DOM node).
- `INFERENCE`: TradingView uses a CSS Grid / Flexbox multi-dock layout where the main chart area (`DIV 1510`) occupies the central viewport, flanked by fixed-width or expandable toolbars on top, left, right, and bottom.
- `UNKNOWN`: The exact CSS pixel dimensions, grid templates, or media queries cannot be verified because inline styles and external stylesheets were redacted in the evidence capture.

---

## 3. Major UI Regions

```
+----------------------------------------------------------------------------------------------------+
|  Top Toolbar (DIV 759 / Acc 1188): Symbol | Interval | Type | Indicators | Layout | User Actions   |
+----+-----------------------------------------------------------------------------------+-----------+
| L  |  Main Chart Region (DIV 1510 / Acc 1785):                                          | Right     |
| e  |  - Chart Status Line / Legend (Symbol, Interval, Market, OHLC)                    | Dock &    |
| f  |  - Instant Execution Widget (Sell / Spread / Buy)                                  | Panel     |
| t  |  - Chart Plot Dual-Canvas (Nodes 1792, 1793)                                      | (DIV 1972 |
|    |  - Price Scale Dual-Canvas (Nodes 1836, 1837)                                     |  / Acc    |
| T  |  - Time Scale Dual-Canvas (Nodes 1870, 1871)                                      |  2183):   |
| o  |  - Floating Chart Toolbar (Node 1914)                                             | Watchlist |
| o  |-----------------------------------------------------------------------------------| Details   |
| l  |  Bottom Timeframe Bar (DIV 3832 / Acc 207): Presets (1D..All) | Timezone | ADJ    | Sparklines|
| b  +-----------------------------------------------------------------------------------| News      |
| a  |  Bottom Dock (DIV 3856 / Acc 333): "Trading panel" tab handle                     | Collapser |
| r  |                                                                                   |           |
+----+-----------------------------------------------------------------------------------+-----------+
```

### 3.1 Top Toolbar (`DIV 759`, Accessibility Subtree `1188`)
- `OBSERVATION`: Accessibility Node 1485 defines a `toolbar` with horizontal orientation (`states: ['orientation']`).
- `OBSERVATION`: Contains 21 accessible button elements, 6 StaticText elements, 6 InlineTextBox elements, and 6 visual separators (`role='separator'`).
- `OBSERVATION`: The buttons are grouped into functional clusters separated by `<HR>` separators:
  1. **Symbol Search & Switcher**:
     - Button `72`: `name='AAPL'`, `desc='Symbol search'`, states `['focusable', 'invalid']`.
     - Button `74`: `name='Switch data type'`, states `['focusable', 'invalid']`.
     - Button `76`: `name='Compare symbols'`, states `['focusable', 'hasPopup', 'invalid']`.
  2. **Timeframe Selection**:
     - Separator Node `1500`.
     - Button `78`: `name='1 day'`, states `['focusable', 'hasPopup', 'invalid']`, displaying text `'D'` (Node 79).
  3. **Chart Type Selection**:
     - Separator Node `1506`.
     - Button `80`: `name='Candles'`, states `['focusable', 'hasPopup', 'invalid']`.
  4. **Analysis & Indicators**:
     - Separator Node `1516`.
     - Button `82`: `name='Indicators, metrics, and strategies'`, states `['focusable', 'invalid']`.
     - Button `84`: `name='Indicator templates'`, states `['focusable', 'hasPopup', 'invalid']`.
  5. **Alerts & Replay**:
     - Separator Node `1526`.
     - Button `86`: `name='Create alert'`, states `['focusable', 'invalid']`.
     - Button `88`: `name='Bar replay'`, states `['focusable', 'invalid', 'pressed']`.
  6. **Undo / Redo**:
     - Separator Node `1532`.
     - Button `90`: disabled state (`states: ['disabled', 'invalid']`).
     - Button `92`: disabled state (`states: ['disabled', 'invalid']`).
  7. **Layout Setup & Persistence**:
     - Button `94`: `name='Layout setup'`, states `['focusable', 'hasPopup', 'invalid']`.
     - Button `96`: `name='Save all charts for all symbols and intervals on your layout'`, text `'Save'`.
     - Button `100`: `name='Manage layouts'`, states `['focusable', 'hasPopup', 'invalid']`.
  8. **Workspace Configuration & Utilities**:
     - Separator Node `1551`.
     - Button `102`: `name='Quick search'`, states `['focusable', 'invalid']`.
     - Button `104`: `name='Settings'`, states `['focusable', 'invalid']`.
     - Button `106`: `name='Fullscreen mode'`, states `['focusable', 'invalid']`.
     - Button `108`: `name='Take a snapshot'`, states `['focusable', 'hasPopup', 'invalid']`.
  9. **Publish & Monetization**:
     - Button `110`: `name='Share your idea with the trade community'`, states `['focusable', 'hasPopup', 'invalid']`.
     - Button `112`: `name='Trade'`, text `'Trade'`.
     - Button `114`: `name='Upgrade'`, text `'Upgrade'`.
- `INFERENCE`: The top toolbar acts as the master parameter controller for the workspace, allowing the user to mutate symbol, interval, chart style, studies, and workspace layout configurations.
- `UNKNOWN`: The internal state store (e.g. Redux, Zustand, MobX, or custom event bus) linking top toolbar selections to the chart rendering engine is not observable in DOM/accessibility evidence.

---

### 3.2 Left Toolbar (`DIV 1310`, Accessibility Subtree `1641`)
- `OBSERVATION`: Accessibility Node 1642 defines a `toolbar` with vertical orientation (`states: ['orientation']`).
- `OBSERVATION`: Contains 27 accessible button elements organized in paired split-button or flyout patterns:
  1. **Cursor Group**:
     - Button `118`: `name='Cross'` (Active primary tool).
     - Button `120`: `name='Cursors'`, states `['focusable', 'invalid', 'pressed']` (Flyout drawer).
  2. **Trend Line Tools**:
     - Button `122`: `name='Trendline'`.
     - Button `124`: `name='Trend tools'`, states `['focusable', 'invalid', 'pressed']`.
  3. **Gann & Fibonacci Tools**:
     - Button `126`: `name='Fib retracement'`.
     - Button `128`: `name='Gann and Fibonacci tools'`, states `['focusable', 'invalid', 'pressed']`.
  4. **Geometric Patterns**:
     - Button `130`: `name='XABCD pattern'`.
     - Button `132`: `name='Patterns'`, states `['focusable', 'invalid', 'pressed']`.
  5. **Forecasting & Measurement Tools**:
     - Button `134`: `name='Long position'`.
     - Button `136`: `name='Forecasting and measurement tools'`, states `['focusable', 'invalid', 'pressed']`.
  6. **Brushes & Shapes**:
     - Button `138`: `name='Brush'`.
     - Button `140`: `name='Geometric shapes'`, states `['focusable', 'invalid', 'pressed']`.
  7. **Annotation Tools**:
     - Button `142`: `name='Text'`.
     - Button `144`: `name='Annotation tools'`, states `['focusable', 'invalid', 'pressed']`.
  8. **Icons**:
     - Button `146`: `name='Icon'`.
     - Button `148`: `name='Icons'`, states `['focusable', 'invalid', 'pressed']`.
  9. **Utility Tools**:
     - Button `150`: `name='Measure'`.
     - Button `152`: `name='Zoom in'`.
  10. **Drawing Mode Modifiers**:
      - Button `154`: `name='Magnet mode snaps drawings placed near price bars to the closest OHLC value'`, states `['focusable', 'invalid', 'pressed']`.
      - Button `156`: `name='Magnets'`, states `['focusable', 'invalid', 'pressed']`.
      - Button `158`: `name='Keep drawing'`, states `['focusable', 'invalid', 'pressed']`.
      - Button `160`: `name='Lock drawings and indicators'`, states `['focusable', 'invalid', 'pressed']`.
      - Button `162`: `name='Lock options'`, states `['focusable', 'invalid', 'pressed']`.
      - Button `164`: `name='Hide all drawings'`, states `['focusable', 'invalid', 'pressed']`.
      - Button `166`: `name='Hide options'`, states `['focusable', 'invalid', 'pressed']`.
  11. **Deletion Actions**:
      - Button `168`: `name='Remove objects'`.
      - Button `170`: `name='Remove options'`.
- `INFERENCE`: The left toolbar follows a nested tool group pattern where each tool button is paired with a secondary chevron button to reveal alternative tools in that category (e.g. Trendline vs Ray vs Horizontal Line).
- `UNKNOWN`: The vector math, point manipulation algorithms, and serialized drawing schemas associated with each drawing tool are not present in the UI snapshot.

---

### 3.3 Main Chart Region (`DIV 1510`, Accessibility Subtree `1785`)
- `OBSERVATION`: Contains Accessibility Node 172 designated with `role='region'` and `name='Chart #1'`.
- `OBSERVATION`: Contains the main chart surface canvas (Accessibility Node 3: `role='Canvas'`, `name='Chart for BATS:AAPL, 1 day'`).
- `OBSERVATION`: Incorporates an in-chart legend/status line (`DIV 1518`), instant execution order widget, volume study legend, and layered canvases for the plot, price scale, and time scale.
- `OBSERVATION`: Incorporates in-chart floating toolbar component `DIV 1914` marked with DOM attribute `data-is-chart-toolbar-component`.
- `INFERENCE`: The chart region is an autonomous viewport that manages its own header overlay, study overlays, and canvas rendering loop.
- *(Detailed canvas and axis breakdowns are documented in `research/chart/chart-surface.md`).*

---

### 3.4 Right-Side Region (`DIV 1972`, Accessibility Subtree `2183`)
- `OBSERVATION`: Contains a total of 1,860 DOM nodes and 1,537 accessibility nodes.
- `OBSERVATION`: Structured into three distinct subtrees:
  1. **Dock Toolbar (`[2185]` -> Toolbar `[2187]`)**: Vertical strip containing 12 panel switches:
     - Button `217`: `Watchlist, details, and news` (Active, states `['pressed']`).
     - Button `219`: `Alerts`.
     - Button `221`: `Object tree and data window`.
     - Button `223`: `AI Copilot`.
     - Button `225`: `Screeners`.
     - Button `227`: `Pine Editor`.
     - Button `229`: `Calendars`.
     - Button `231`: `Community`.
     - Button `233`: `Notifications`.
     - Button `235`: `Chats`.
     - Button `237`: `Products` (states `['hasPopup']`).
     - Button `239`: `Help Center`.
  2. **Active Drawer Panel (`[2238]`)**:
     - **Watchlist Header**: Button `241` (`Watchlist`), Button `244` (`Add symbol`), Button `246` (`Advanced view`), Button `248` (`Settings`).
     - **Watchlist Table**: Columns `Symbol` (Button 252), `Last` (Button 254), `Chg` (Button 256), `Chg%` (Button 258).
     - **Symbol Details Section (`[3163]`)**: Comprehensive profile for `AAPL` (`Apple Inc`, price `343.46`, market volume `59.95M`, business summary, analyst targets, financials, and options volatility curves).
     - **Mini-Charts / Sparklines**: Observed within DOM nodes `3497` and `3701` (HTML tables with embedded canvas elements, containing 13 small canvas tags).
  3. **Collapse Handle (`[3930]`)**:
     - Node `3931`: `generic`, `desc='Hide Tab'` with icon `[332]`.
- `INFERENCE`: The right-side area operates as a collapsible drawer dock where clicking any icon on toolbar `2187` slides out the corresponding functional panel. In this observation, the Watchlist & Details panel was active.
- `UNKNOWN`: The WebSocket or REST feed populating real-time watchlist quote updates cannot be determined from this snapshot because network bodies were policy-filtered.

---

### 3.5 Bottom Region (`DIV 3832` & `DIV 3856`)
- `OBSERVATION`: Divided into two distinct horizontal tiers:
  1. **Timeframe Range Presets & Timezone Toolbar (`DIV 3832`, Acc Node 207 / 2134)**:
     - Preset buttons: `1D` (Button 2146), `5D` (Button 2149), `1M` (Button 2152), `3M` (Button 2155), `6M` (Button 2158), `YTD` (Button 2161), `1Y` (Button 2164), `5Y` (Button 2167), `All` (Button 2170).
     - Date picker jump: Button `209` (`Go to`).
     - Timezone indicator: Button `211` (`Timezone`, text `'04:55:53 UTC'`).
     - Data adjustment toggle: Button `213` (`Adjust data for dividends`, text `'ADJ'`, state `pressed`).
  2. **Docked Trading Panel (`DIV 3856`, Acc Node 333)**:
     - Node `333`: `role='generic'`, `name='Trading panel'`.
- `INFERENCE`: The timeframe toolbar controls visible historical range and bar aggregation presets, while the bottom dock provides access to broker integration, paper trading, and account consoles.
- `UNKNOWN`: Whether the trading panel can be undocked, expanded into a full modal, or minimized completely is not directly provable without interactive state mutations.

---

## 4. Symbol, Timeframe, and Chart Type Controls

### 4.1 Symbol Controls
- `OBSERVATION`: Symbol control appears in three distinct locations:
  1. Top Toolbar Button `72`: `name='AAPL'`, `desc='Symbol search'`.
  2. Main Chart Legend Button `175`: `name='Change symbol'`, text `'Apple Inc'`.
  3. Watchlist Table Header Button `252`: `name='Symbol'`.
- `OBSERVATION`: Symbol comparison is exposed via Top Toolbar Button `76`: `name='Compare symbols'` (`hasPopup: true`).
- `INFERENCE`: Clicking either Button 72 or Button 175 opens the TradingView Symbol Search modal to search across equities, forex, crypto, and futures.

### 4.2 Timeframe Controls
- `OBSERVATION`: Timeframe controls are exposed in two distinct formats:
  1. **Bar Interval Selector (Top Toolbar)**:
     - Button `78`: `name='1 day'`, text `'D'` (`hasPopup: true`).
     - Main chart status line Button `177`: `name='Change interval'`, text `'1D'`.
  2. **Visible Range Presets (Bottom Toolbar Node 2145)**:
     - Button `2146`: `name='1 day in 1 minute intervals'` (label: `'1D'`).
     - Button `2149`: `name='5 days in 5 minutes intervals'` (label: `'5D'`).
     - Button `2152`: `name='1 month in 30 minutes intervals'` (label: `'1M'`).
     - Button `2155`: `name='3 months in 1 hour intervals'` (label: `'3M'`).
     - Button `2158`: `name='6 months in 2 hours intervals'` (label: `'6M'`).
     - Button `2161`: `name='Year to day in 1 day intervals'` (label: `'YTD'`).
     - Button `2164`: `name='1 year in 1 day intervals'` (label: `'1Y'`).
     - Button `2167`: `name='5 years in 1 week intervals'` (label: `'5Y'`).
     - Button `2170`: `name='All data in 1 month intervals'` (label: `'All'`).
- `INFERENCE`: TradingView distinguishes between the individual bar aggregation interval (e.g. 1-day candles) and the visible time window preset (e.g. "Year to date"). The bottom presets automatically adjust both the visible span and the candle resolution.

### 4.3 Chart Type Controls
- `OBSERVATION`: Chart type is selected via Top Toolbar Button `80`: `name='Candles'`, states `['focusable', 'hasPopup', 'invalid']`.
- `INFERENCE`: The popup menu associated with Button 80 contains alternative series representations (e.g. Bars, Hollow Candles, Heikin Ashi, Line, Area, Baseline).
- `UNKNOWN`: The list of alternative chart types is not enumerated in the static tree because the popup menu was not active/opened at capture time.

---

## 5. Important DOM Containers & Component Markers

- `OBSERVATION`: The DOM inspection reveals explicit custom attributes and data markers:
  - `data-qa-id`: Observed on major toolbar containers, chart wrapper (`DIV 747`, `DIV 1511`, `DIV 1518`), and buttons.
  - `data-is-chart-toolbar-component`: Observed on `DIV 1914` (in-chart floating toolbar).
  - `data-test-id-widget-type`: Observed on `DIV 3050` (right-hand widget host).
  - `data-mini-chart-id`: Observed on `DIV 3495` (sparkline container in details panel).
  - `data-test-id-value-title`: Observed on `DIV 1780` and `DIV 1784` (status line OHLC value badges).
  - `data-tooltip` & `data-tooltip-hotkey`: Observed on chart action buttons (e.g. `BUTTON 1956`, `DIV 1808`).
  - `data-mouse-click-auto-blur`: Observed on toolbar focus management wrappers (`DIV 1915`).
  - `data-theme`: Observed on `<HTML>` (Node 2), confirming theme state support.
- `INFERENCE`: TradingView's frontend architecture uses data-attribute-driven selectors for automated testing (QA IDs) and component initialization markers.

---

## 6. Canvas & SVG Elements Overview

- `OBSERVATION`: Exactly 20 `<canvas>` elements were captured in the DOM:
  - **Main Chart Surface (7 canvases)**:
    - Node `1792`: Plot background canvas (`width`, `height`, `style`, `data-name`, `aria-hidden`).
    - Node `1793`: Plot interaction canvas (`width`, `height`, `style`, `data-qa-id`, `aria-label`).
    - Node `1836`: Price scale background canvas (`width`, `height`, `style`).
    - Node `1837`: Price scale interaction canvas (`width`, `height`, `style`).
    - Node `1870`: Time scale background canvas (`width`, `height`, `style`).
    - Node `1871`: Time scale interaction canvas (`width`, `height`, `style`).
    - Node `1874`: Axis corner canvas (`width`, `height`, `style`).
  - **Right-Hand Panel Sparklines (13 canvases)**:
    - Nodes `3413`, `3502`, `3503`, `3509`, `3510`, `3666`, `3706`, `3707`, `3710`, `3711`, `3716`, `3717`, `3720`.
- `OBSERVATION`: 120+ `<svg>` elements are present across the DOM tree, utilized as vector icons for buttons, chevrons, tool glyphs, and status badges.
- `INFERENCE`: TradingView renders all financial time series, grid lines, cursors, and technical indicator paths using HTML5 2D Canvas rendering, while UI controls, buttons, toolbars, and menus remain semantic HTML/DOM with inline SVG icons.

---

## 7. Relevant Scripts & Resources Analysis

- `OBSERVATION`: 13 JavaScript inline scripts on origin `https://www.tradingview.com/chart/` were recorded in `normalized_result.scripts.items`:
  - `scr_28b4620ec8931bc5d52050d9bc4630fb1ba6c9b1a4e37b4152d78417cd66a460` (length: 424 bytes)
  - `scr_2a481f6a65ef9fccfd273a9e82b3d4119ed63d48674e0568c77a03b57e46e1b7` (length: 21,609 bytes)
  - `scr_2e66de4e464e0ad993a715228865f9b7d0fe90fc255c8a6c117f674d6b6b3ae2` (length: 21 bytes)
  - `scr_355f018faf924a01553057ff23df2dd74f014664d0e66fc531bf88f546ecc545` (length: 248 bytes)
  - `scr_50118619525b20e4f6f8f280d4e2a77a9a8999262ba267ec2115722888d9f341` (length: 710 bytes)
  - `scr_7fd63cb3ebe706db2ca3a0e41a1a06dd0e8c33011c6834b6cf60156911ec7d75` (length: 176 bytes)
  - `scr_80c1bf4af4e787ba9187ba9fc378114ef06a14a4bc35664eab483d1d0be27841` (length: 995 bytes)
  - `scr_8c64b4eb0db0e88a6a1aa2be34f3584ae00eb0587af70cdf0f0d28828f467b6f` (length: 489 bytes)
  - `scr_c82d0d52e38d6f3fd8a557ad6afed428dc18843a4e0ac72275490ac808f60f96` (length: 35 bytes)
  - `scr_cdc95b583e34ca7c37db061e3f536dcbd7db78753edcef82838080f20313f7db` (length: 375 bytes)
  - `scr_ce14540ab2567c79b62493f61623d8e6e1a57cbe54122418321baaec6001df90` (length: 4,109 bytes)
  - `scr_d92bca41102ec42b1d923a3034bac9380b32e3f41f96e5f394943b6ed405dbc8` (length: 49 bytes)
  - `scr_eb345276afbc30ff68bd1adaff4abba45c6b7a47409ba7ccbc4a0c883defcec8` (length: 15,186 bytes)
- `OBSERVATION`: 351 external script assets and 686 resource assets were excluded from capture due to `reason: 'disallowed_origin'`.
- `OBSERVATION`: Storage inspection recorded `usage_bytes: 1167816` (~1.17 MB) out of quota `38654074060` (~38.65 GB) with `values_redacted: true`.
- `INFERENCE`: TradingView's main charting runtime, chart engine, and Pine interpreter bundles are loaded from dedicated CDN origins (such as `static.tradingview.com`), which were excluded by the origin-filtering policy in this REA profile.
- `UNKNOWN`: The internal architecture of TradingView's JavaScript bundles (e.g. Charting Library core, WebAssembly modules, Web Workers) cannot be analyzed from this evidence alone because CDN script sources were excluded.

---

## 8. Observed Limitations & Policy Boundaries

- `OBSERVATION`: `limitations` reported in `tradingview-workspace.json`:
  1. *"Artifact identity is unavailable for this observation."*
  2. *"Observation starts when REA attaches; prior network and console activity is unavailable."*
  3. *"Raw network headers, bodies, cookies, storage values, console objects, and WebSocket payloads are never retained; explicitly requested primitive console text is retained verbatim, while payload captures retain value-free shapes."*
  4. *"Source maps are reported only as declarative URLs and are not fetched."*
  5. *"URL-less scripts and console events without an allowed source URL are excluded because their origin cannot be proven."*
  6. *"CDP discovery omitted the target attachment state; attached is reported as unknown."*
  7. *"Browser host platform and architecture were not observed."*
- `OBSERVATION`: DOM node inspection omitted specific attribute string values (e.g. CSS class lists, inline style properties, exact element IDs) in favor of structural metadata (`attribute_names`, `node_type`, `parent_index`, `node_value_length`).
- `INFERENCE`: To inspect exact CSS class naming conventions, WebSocket wire formats, or script implementations, targeted REA profiles with expanded origin allowlists and runtime network tracing would be required.
- `UNKNOWN`: Dynamic runtime behaviors, user drag/drop interactions, candle hover responses, and chart re-rendering pipelines cannot be observed from a static snapshot.
