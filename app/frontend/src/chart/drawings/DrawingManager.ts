import type { Drawing, DataPoint } from './Drawing';
import type { Candle } from '../models/Candle';
import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';
import { TrendLine, timeToIndex } from './TrendLine';
import { HorizontalLine } from './HorizontalLine';
import { MeasurementTool } from './MeasurementTool';
import { DrawingHitTest, type HitType } from './DrawingHitTest';

export type DrawingToolType = 'cursor' | 'trendline' | 'horizontal' | 'measure';

export class DrawingManager {
  public drawings: Drawing[] = [];
  public inProgressDrawing: Drawing | null = null;
  public activeTool: DrawingToolType = 'cursor';
  public selectedDrawingId: string | null = null;
  public hoveredDrawingId: string | null = null;
  public isDragging: boolean = false;

  private dragTarget: {
    drawingId: string;
    hitType: HitType;
    initialPoints: DataPoint[];
    startMouse: { x: number; y: number; time: number; price: number };
  } | null = null;

  private onDrawingChange?: () => void;

  constructor(onDrawingChange?: () => void) {
    this.onDrawingChange = onDrawingChange;
  }

  public setTool(tool: DrawingToolType): void {
    this.activeTool = tool;
    this.inProgressDrawing = null;
    if (tool !== 'cursor') {
      this.deselectAll();
    }
    this.onDrawingChange?.();
  }

  public selectDrawing(id: string | null): void {
    this.selectedDrawingId = id;
    for (const d of this.drawings) {
      d.selected = d.id === id;
    }
    this.onDrawingChange?.();
  }

  public deselectAll(): boolean {
    if (this.selectedDrawingId !== null) {
      this.selectedDrawingId = null;
      for (const d of this.drawings) {
        d.selected = false;
      }
      this.onDrawingChange?.();
      return true;
    }
    return false;
  }

  public cancelInProgress(): boolean {
    if (this.inProgressDrawing) {
      this.inProgressDrawing = null;
      this.onDrawingChange?.();
      return true;
    }
    return false;
  }

  public clearAll(): void {
    this.drawings = [];
    this.inProgressDrawing = null;
    this.selectedDrawingId = null;
    this.hoveredDrawingId = null;
    this.isDragging = false;
    this.dragTarget = null;
    this.onDrawingChange?.();
  }

  public removeDrawing(id: string): void {
    this.drawings = this.drawings.filter((d) => d.id !== id);
    if (this.selectedDrawingId === id) {
      this.selectedDrawingId = null;
    }
    this.onDrawingChange?.();
  }

  public deleteSelected(): boolean {
    if (this.selectedDrawingId) {
      this.removeDrawing(this.selectedDrawingId);
      return true;
    }
    return false;
  }

  /**
   * Handle pointer down when active tool is 'cursor' (selection & drag start)
   */
  public handlePointerDownCursor(
    mouseX: number,
    mouseY: number,
    time: number,
    price: number,
    candles: Candle[],
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number
  ): boolean {
    if (this.activeTool !== 'cursor') return false;

    const hit = DrawingHitTest.test(
      this.drawings,
      mouseX,
      mouseY,
      candles,
      timeScale,
      priceScale,
      plotWidth,
      plotHeight
    );

    if (hit) {
      this.selectDrawing(hit.drawing.id);
      this.isDragging = true;
      this.dragTarget = {
        drawingId: hit.drawing.id,
        hitType: hit.hitType,
        initialPoints: hit.drawing.points.map((p) => ({ ...p })),
        startMouse: { x: mouseX, y: mouseY, time, price },
      };
      return true;
    } else {
      const wasSelected = this.deselectAll();
      return wasSelected; // If deselected, consume event; else allow panning
    }
  }

  /**
   * Handle pointer move when dragging a drawing handle/body or hovering
   */
  public handlePointerMoveCursor(
    mouseX: number,
    mouseY: number,
    time: number,
    price: number,
    candles: Candle[],
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number
  ): { isDragging: boolean; cursor: string | null } {
    if (this.activeTool !== 'cursor') {
      return { isDragging: false, cursor: null };
    }

    if (this.isDragging && this.dragTarget) {
      const drawing = this.drawings.find((d) => d.id === this.dragTarget!.drawingId);
      if (!drawing) {
        this.isDragging = false;
        this.dragTarget = null;
        return { isDragging: false, cursor: null };
      }

      const { hitType, initialPoints, startMouse } = this.dragTarget;

      if (hitType === 'handle-p1' && drawing.points.length >= 1) {
        drawing.points[0] = { time, price };
      } else if (hitType === 'handle-p2' && drawing.points.length >= 2) {
        drawing.points[1] = { time, price };
      } else if (hitType === 'body') {
        if (drawing.type === 'horizontal' && drawing.points.length >= 1) {
          drawing.points[0] = { time: drawing.points[0].time, price };
        } else if (
          (drawing.type === 'trendline' || drawing.type === 'measure') &&
          drawing.points.length >= 2 &&
          initialPoints.length >= 2
        ) {
          const deltaPrice = price - startMouse.price;
          const startIdx = timeScale.xToIndex(startMouse.x);
          const curIdx = timeScale.xToIndex(mouseX);
          const deltaIndex = Math.round(curIdx - startIdx);

          for (let i = 0; i < drawing.points.length; i++) {
            const initP = initialPoints[i];
            const baseIdx = timeToIndex(initP.time, candles);
            const targetIdx = Math.max(0, Math.min(candles.length - 1, baseIdx + deltaIndex));
            const newTime = candles[targetIdx]?.time ?? initP.time;
            drawing.points[i] = {
              time: newTime,
              price: initP.price + deltaPrice,
            };
          }
        }
      }

      this.onDrawingChange?.();
      return { isDragging: true, cursor: 'move' };
    }

    // Hover detection when not dragging
    const hit = DrawingHitTest.test(
      this.drawings,
      mouseX,
      mouseY,
      candles,
      timeScale,
      priceScale,
      plotWidth,
      plotHeight
    );

    const prevHovered = this.hoveredDrawingId;
    this.hoveredDrawingId = hit ? hit.drawing.id : null;

    for (const d of this.drawings) {
      d.hovered = d.id === this.hoveredDrawingId;
    }

    if (prevHovered !== this.hoveredDrawingId) {
      this.onDrawingChange?.();
    }

    if (hit) {
      const cursor =
        hit.hitType === 'handle-p1' || hit.hitType === 'handle-p2'
          ? 'crosshair'
          : hit.drawing.type === 'horizontal'
          ? 'ns-resize'
          : 'pointer';
      return { isDragging: false, cursor };
    }

    return { isDragging: false, cursor: null };
  }

  /**
   * Handle pointer up to finalize drag
   */
  public handlePointerUpCursor(): boolean {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragTarget = null;
      this.onDrawingChange?.();
      return true;
    }
    return false;
  }

  /**
   * Handle pointer click on chart to create or finalize drawings
   */
  public handleChartClick(time: number, price: number): boolean {
    if (this.activeTool === 'cursor') return false;

    const pt: DataPoint = { time, price };

    if (this.activeTool === 'horizontal') {
      const newDrawing: Drawing = {
        id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'horizontal',
        points: [pt],
        color: '#f59e0b',
        lineWidth: 1.5,
        selected: false,
      };
      this.drawings.push(newDrawing);
      this.onDrawingChange?.();
      return true;
    }

    if (this.activeTool === 'trendline' || this.activeTool === 'measure') {
      if (!this.inProgressDrawing) {
        // Point 1: Start drawing
        this.inProgressDrawing = {
          id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: this.activeTool,
          points: [pt, { ...pt }],
          color: this.activeTool === 'trendline' ? '#2962ff' : '#089981',
          lineWidth: 2,
          selected: false,
        };
        this.onDrawingChange?.();
        return true;
      } else {
        // Point 2: Finalize drawing
        this.inProgressDrawing.points[1] = pt;
        this.drawings.push({ ...this.inProgressDrawing });
        this.inProgressDrawing = null;
        this.onDrawingChange?.();
        return true;
      }
    }

    return false;
  }

  /**
   * Handle pointer move to update in-progress preview
   */
  public handleChartPointerMove(time: number, price: number): boolean {
    if (!this.inProgressDrawing) return false;

    this.inProgressDrawing.points[1] = { time, price };
    this.onDrawingChange?.();
    return true;
  }

  /**
   * Render all drawings onto the target canvas context
   */
  public render(
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number
  ): void {
    if (plotWidth <= 0 || plotHeight <= 0) return;

    // Render committed drawings
    for (const d of this.drawings) {
      this.renderSingleDrawing(ctx, d, candles, timeScale, priceScale, plotWidth, plotHeight);
    }

    // Render in-progress drawing preview
    if (this.inProgressDrawing) {
      this.renderSingleDrawing(ctx, this.inProgressDrawing, candles, timeScale, priceScale, plotWidth, plotHeight);
    }
  }

  private renderSingleDrawing(
    ctx: CanvasRenderingContext2D,
    d: Drawing,
    candles: Candle[],
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number
  ): void {
    switch (d.type) {
      case 'trendline':
        TrendLine.render(ctx, d, candles, timeScale, priceScale, plotHeight);
        break;
      case 'horizontal':
        HorizontalLine.render(ctx, d, priceScale, plotWidth, plotHeight);
        break;
      case 'measure':
        MeasurementTool.render(ctx, d, candles, timeScale, priceScale, plotHeight);
        break;
    }
  }
}
