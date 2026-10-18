import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';

export interface ZoomControllerOptions {
  timeScale: TimeScale;
  priceScale: PriceScale;
  onRequestRender: () => void;
}

export class ZoomController {
  private timeScale: TimeScale;
  private priceScale: PriceScale;
  private onRequestRender: () => void;

  // Price scale dragging state
  private isPriceDragging: boolean = false;
  private priceLastY: number = 0;

  // Time scale dragging state
  private isTimeDragging: boolean = false;
  private timeLastX: number = 0;

  constructor(options: ZoomControllerOptions) {
    this.timeScale = options.timeScale;
    this.priceScale = options.priceScale;
    this.onRequestRender = options.onRequestRender;
  }

  public get isPriceScaleDragging(): boolean {
    return this.isPriceDragging;
  }

  public get isTimeScaleDragging(): boolean {
    return this.isTimeDragging;
  }

  /**
   * Wheel zoom on the plot canvas, centered at pointer X coordinate
   */
  public handleWheel(e: WheelEvent, mouseX: number): void {
    e.preventDefault();

    // Invert deltaY for natural pinch/wheel feel: scroll up (negative deltaY) zooms in (factor > 1)
    const zoomIntensity = 0.0015;
    const factor = Math.exp(-e.deltaY * zoomIntensity);

    this.timeScale.zoom(factor, mouseX);
    this.onRequestRender();
  }

  // --- Price Scale Drag Interaction (Vertical Zoom & Pan) ---

  public handlePriceScalePointerDown(e: PointerEvent, targetElement: HTMLElement): void {
    if (e.button !== 0) return;
    this.isPriceDragging = true;
    this.priceLastY = e.clientY;
    targetElement.setPointerCapture(e.pointerId);
  }

  public handlePriceScalePointerMove(e: PointerEvent, plotHeight: number): boolean {
    if (!this.isPriceDragging || plotHeight <= 0) return false;

    const deltaY = e.clientY - this.priceLastY;
    this.priceLastY = e.clientY;

    if (deltaY !== 0) {
      // Dragging down expands price range (zooms out), dragging up contracts (zooms in)
      const zoomFactor = 1 + deltaY * 0.008;
      const anchorY = plotHeight / 2;
      this.priceScale.zoom(zoomFactor, anchorY, plotHeight);
      this.onRequestRender();
    }

    return true;
  }

  public handlePriceScalePointerUp(e: PointerEvent, targetElement: HTMLElement): void {
    if (!this.isPriceDragging) return;
    this.isPriceDragging = false;
    try {
      if (targetElement.hasPointerCapture(e.pointerId)) {
        targetElement.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore pointer capture errors
    }
  }

  // --- Time Scale Drag Interaction (Horizontal Zoom) ---

  public handleTimeScalePointerDown(e: PointerEvent, targetElement: HTMLElement): void {
    if (e.button !== 0) return;
    this.isTimeDragging = true;
    this.timeLastX = e.clientX;
    targetElement.setPointerCapture(e.pointerId);
  }

  public handleTimeScalePointerMove(e: PointerEvent, plotWidth: number): boolean {
    if (!this.isTimeDragging || plotWidth <= 0) return false;

    const deltaX = e.clientX - this.timeLastX;
    this.timeLastX = e.clientX;

    if (deltaX !== 0) {
      // Dragging right zooms out, dragging left zooms in (or vice versa standard)
      const zoomFactor = 1 - deltaX * 0.008;
      const anchorX = plotWidth / 2;
      this.timeScale.zoom(zoomFactor, anchorX);
      this.onRequestRender();
    }

    return true;
  }

  public handleTimeScalePointerUp(e: PointerEvent, targetElement: HTMLElement): void {
    if (!this.isTimeDragging) return;
    this.isTimeDragging = false;
    try {
      if (targetElement.hasPointerCapture(e.pointerId)) {
        targetElement.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore pointer capture errors
    }
  }
}
