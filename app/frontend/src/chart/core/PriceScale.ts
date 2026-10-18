import type { Candle } from '../models/Candle';

export interface PriceTick {
  y: number;
  price: number;
  label: string;
}

export class PriceScale {
  public priceMin: number = 300;
  public priceMax: number = 360;
  public autoScale: boolean = true;
  public width: number = 58; // Standard fixed width

  constructor(priceMin: number = 300, priceMax: number = 360) {
    this.priceMin = priceMin;
    this.priceMax = priceMax;
  }

  /**
   * Converts a price value to pixel Y coordinate
   */
  public priceToY(price: number, plotHeight: number): number {
    if (this.priceMax === this.priceMin || plotHeight <= 0) return plotHeight / 2;
    return plotHeight * ((this.priceMax - price) / (this.priceMax - this.priceMin));
  }

  /**
   * Converts a pixel Y coordinate to price value
   */
  public yToPrice(y: number, plotHeight: number): number {
    if (plotHeight <= 0) return this.priceMin;
    return this.priceMax - (y / plotHeight) * (this.priceMax - this.priceMin);
  }

  /**
   * Automatically recalculates price bounds based on visible candles
   */
  public updateAutoScale(visibleCandles: Candle[]): void {
    if (!this.autoScale || visibleCandles.length === 0) return;

    let minLow = Infinity;
    let maxHigh = -Infinity;

    for (const c of visibleCandles) {
      if (c.low < minLow) minLow = c.low;
      if (c.high > maxHigh) maxHigh = c.high;
    }

    if (minLow === Infinity || maxHigh === -Infinity) return;

    // Add 8% top and bottom margin
    const diff = Math.max(0.5, maxHigh - minLow);
    const margin = diff * 0.08;

    this.priceMin = Math.round((minLow - margin) * 100) / 100;
    this.priceMax = Math.round((maxHigh + margin) * 100) / 100;
  }

  /**
   * Manual vertical scale zoom (disables autoScale)
   */
  public zoom(factor: number, anchorY: number, plotHeight: number): void {
    this.autoScale = false;
    const anchorPrice = this.yToPrice(anchorY, plotHeight);
    const range = this.priceMax - this.priceMin;
    const newRange = Math.max(0.2, range * factor);

    const anchorRatio = (anchorPrice - this.priceMin) / range;
    this.priceMin = anchorPrice - anchorRatio * newRange;
    this.priceMax = this.priceMin + newRange;
  }

  /**
   * Vertical pan / drag on price scale (disables autoScale)
   */
  public pan(deltaY: number, plotHeight: number): void {
    this.autoScale = false;
    const range = this.priceMax - this.priceMin;
    const priceDelta = (deltaY / plotHeight) * range;
    this.priceMin += priceDelta;
    this.priceMax += priceDelta;
  }

  /**
   * Re-enables autoScale
   */
  public resetView(): void {
    this.autoScale = true;
  }

  /**
   * Generates nice round price ticks and labels
   */
  public calculatePriceTicks(plotHeight: number): PriceTick[] {
    if (plotHeight <= 0 || this.priceMax <= this.priceMin) return [];

    const targetTickCount = Math.max(3, Math.min(12, Math.floor(plotHeight / 48)));
    const rawStep = (this.priceMax - this.priceMin) / targetTickCount;

    // Find closest clean step (e.g., 0.1, 0.2, 0.5, 1, 2, 5, 10, 20...)
    const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const magnitude = rawStep / power;
    let cleanStep = power;
    if (magnitude >= 5) cleanStep = 5 * power;
    else if (magnitude >= 2) cleanStep = 2 * power;
    else cleanStep = 1 * power;

    cleanStep = Math.max(0.01, cleanStep);

    const firstTick = Math.ceil(this.priceMin / cleanStep) * cleanStep;
    const ticks: PriceTick[] = [];

    for (let p = firstTick; p <= this.priceMax; p += cleanStep) {
      const y = this.priceToY(p, plotHeight);
      if (y >= 0 && y <= plotHeight) {
        ticks.push({
          y,
          price: p,
          label: p.toFixed(cleanStep < 1 ? 2 : 2),
        });
      }
    }

    return ticks;
  }
}
