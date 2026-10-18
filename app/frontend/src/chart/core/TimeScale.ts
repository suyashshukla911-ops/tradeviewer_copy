import type { Candle } from '../models/Candle';

export interface TimeTick {
  x: number;
  time: number;
  label: string;
}

export class TimeScale {
  public barSpacing: number = 10;
  public minBarSpacing: number = 2.5;
  public maxBarSpacing: number = 80;
  public rightOffset: number = 6; // Blank bars on the right
  public originX: number = 0; // Pixel X position of bar index 0

  constructor(barSpacing: number = 10) {
    this.barSpacing = barSpacing;
  }

  public get barWidth(): number {
    return Math.max(1, Math.floor(this.barSpacing * 0.75));
  }

  /**
   * Converts a bar index to its screen X center coordinate
   */
  public indexToX(index: number): number {
    return this.originX + index * this.barSpacing + this.barSpacing / 2;
  }

  /**
   * Converts a screen X coordinate to a fractional bar index
   */
  public xToIndex(x: number): number {
    return (x - this.originX - this.barSpacing / 2) / this.barSpacing;
  }

  /**
   * Shifts horizontal position by deltaX pixels
   */
  public pan(deltaX: number): void {
    this.originX += deltaX;
  }

  /**
   * Zooms horizontal spacing anchored at anchorX
   */
  public zoom(factor: number, anchorX: number): void {
    const anchorIndex = (anchorX - this.originX) / this.barSpacing;
    const newSpacing = Math.max(this.minBarSpacing, Math.min(this.maxBarSpacing, this.barSpacing * factor));
    if (newSpacing === this.barSpacing) return;

    this.barSpacing = newSpacing;
    this.originX = anchorX - anchorIndex * this.barSpacing;
  }

  /**
   * Returns visible index range [startIndex, endIndex]
   */
  public getVisibleRange(plotWidth: number, totalBars: number): { startIndex: number; endIndex: number } {
    if (totalBars === 0) return { startIndex: 0, endIndex: 0 };
    const rawStart = Math.floor((0 - this.originX) / this.barSpacing) - 1;
    const rawEnd = Math.ceil((plotWidth - this.originX) / this.barSpacing) + 1;

    return {
      startIndex: Math.max(0, rawStart),
      endIndex: Math.min(totalBars - 1, Math.max(0, rawEnd)),
    };
  }

  /**
   * Resets view so latest candles are centered nicely with right margin
   */
  public resetView(plotWidth: number, totalBars: number): void {
    this.barSpacing = Math.max(this.minBarSpacing, Math.min(24, Math.floor(plotWidth / 65)));
    // Place the last bar near the right edge minus rightOffset
    const targetLastBarX = plotWidth - this.rightOffset * this.barSpacing;
    this.originX = targetLastBarX - (totalBars - 1) * this.barSpacing - this.barSpacing / 2;
  }

  /**
   * Computes non-overlapping time scale ticks and formatted labels
   */
  public calculateTimeTicks(plotWidth: number, candles: Candle[]): TimeTick[] {
    if (candles.length === 0 || plotWidth <= 0) return [];

    const { startIndex, endIndex } = this.getVisibleRange(plotWidth, candles.length);
    if (startIndex > endIndex) return [];

    const isIntraday = candles.length > 1 && Math.abs(candles[1].time - candles[0].time) < 86400;

    const minTickDistance = 80; // Minimum px between date labels
    const maxTicks = Math.max(2, Math.floor(plotWidth / minTickDistance));
    const count = endIndex - startIndex + 1;
    const step = Math.max(1, Math.floor(count / maxTicks));

    const ticks: TimeTick[] = [];
    let lastX = -minTickDistance;

    for (let i = startIndex; i <= endIndex; i += step) {
      const c = candles[i];
      if (!c) continue;

      const x = this.indexToX(i);
      if (x >= 0 && x <= plotWidth && x - lastX >= minTickDistance) {
        const date = new Date(c.time * 1000);
        const label = this.formatDate(date, isIntraday);
        ticks.push({ x, time: c.time, label });
        lastX = x;
      }
    }

    return ticks;
  }

  public formatDate(d: Date, isIntraday: boolean = false): string {
    const day = d.getUTCDate();
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');

    if (isIntraday) {
      return `${hours}:${minutes}`;
    }
    const year = d.getUTCFullYear();
    return `${day} ${month} '${String(year).slice(-2)}`;
  }

  public formatFullDate(d: Date, isIntraday: boolean = false): string {
    const day = d.getUTCDate();
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');

    if (isIntraday) {
      return `${day} ${month} ${hours}:${minutes}`;
    }
    return `${day} ${month} '${String(year).slice(-2)}`;
  }
}
