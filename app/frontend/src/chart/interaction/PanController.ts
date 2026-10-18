import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';

export interface PanControllerOptions {
  timeScale: TimeScale;
  priceScale: PriceScale;
  onRequestRender: () => void;
  onPanChange?: (isPanning: boolean) => void;
}

export class PanController {
  private timeScale: TimeScale;
  private priceScale: PriceScale;
  private onRequestRender: () => void;
  private onPanChange?: (isPanning: boolean) => void;

  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  constructor(options: PanControllerOptions) {
    this.timeScale = options.timeScale;
    this.priceScale = options.priceScale;
    this.onRequestRender = options.onRequestRender;
    this.onPanChange = options.onPanChange;
  }

  public get isPanning(): boolean {
    return this.isDragging;
  }

  public handlePointerDown(e: PointerEvent, targetElement: HTMLElement): void {
    if (e.button !== 0) return; // Only primary button
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    targetElement.setPointerCapture(e.pointerId);
    this.onPanChange?.(true);
  }

  public handlePointerMove(e: PointerEvent, plotHeight: number): boolean {
    if (!this.isDragging) return false;

    const deltaX = e.clientX - this.lastX;
    const deltaY = e.clientY - this.lastY;

    this.lastX = e.clientX;
    this.lastY = e.clientY;

    if (deltaX !== 0) {
      this.timeScale.pan(deltaX);
    }

    // If autoScale is disabled, also allow vertical pan on plot
    if (!this.priceScale.autoScale && deltaY !== 0 && plotHeight > 0) {
      this.priceScale.pan(deltaY, plotHeight);
    }

    this.onRequestRender();
    return true;
  }

  public handlePointerUp(e: PointerEvent, targetElement: HTMLElement): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    try {
      if (targetElement.hasPointerCapture(e.pointerId)) {
        targetElement.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore pointer capture errors
    }
    this.onPanChange?.(false);
  }

  public handlePointerCancel(e: PointerEvent, targetElement: HTMLElement): void {
    this.handlePointerUp(e, targetElement);
  }
}
