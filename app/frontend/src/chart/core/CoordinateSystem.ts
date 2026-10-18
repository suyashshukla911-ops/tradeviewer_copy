import { TimeScale } from './TimeScale';
import { PriceScale } from './PriceScale';
import type { ViewportDimensions } from '../models/ChartState';

export class CoordinateSystem {
  public timeScale: TimeScale;
  public priceScale: PriceScale;
  public dimensions: ViewportDimensions;

  constructor(timeScale: TimeScale, priceScale: PriceScale, dimensions: ViewportDimensions) {
    this.timeScale = timeScale;
    this.priceScale = priceScale;
    this.dimensions = dimensions;
  }

  /**
   * Converts bar index and price to screen pixel (X, Y)
   */
  public toScreen(index: number, price: number): { x: number; y: number } {
    return {
      x: this.timeScale.indexToX(index),
      y: this.priceScale.priceToY(price, this.dimensions.plotHeight),
    };
  }

  /**
   * Converts screen pixel (X, Y) to fractional bar index and price
   */
  public fromScreen(x: number, y: number): { index: number; price: number } {
    return {
      index: this.timeScale.xToIndex(x),
      price: this.priceScale.yToPrice(y, this.dimensions.plotHeight),
    };
  }

  /**
   * Sets up high-DPI scaling on an HTML5 canvas element
   */
  public static setupCanvas(
    canvas: HTMLCanvasElement,
    cssWidth: number,
    cssHeight: number,
    dpr: number = window.devicePixelRatio || 1
  ): CanvasRenderingContext2D | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const roundedWidth = Math.max(1, Math.round(cssWidth));
    const roundedHeight = Math.max(1, Math.round(cssHeight));

    // Only resize canvas buffer if dimensions actually changed
    const targetBufferWidth = Math.round(roundedWidth * dpr);
    const targetBufferHeight = Math.round(roundedHeight * dpr);

    if (canvas.width !== targetBufferWidth || canvas.height !== targetBufferHeight) {
      canvas.width = targetBufferWidth;
      canvas.height = targetBufferHeight;
    }

    canvas.style.width = `${roundedWidth}px`;
    canvas.style.height = `${roundedHeight}px`;

    // Reset transform and apply DPR scaling
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return ctx;
  }
}
