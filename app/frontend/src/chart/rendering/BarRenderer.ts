import type { Candle } from '../models/Candle';
import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';

export class BarRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number
  ): void {
    if (candles.length === 0 || plotWidth <= 0 || plotHeight <= 0) return;

    const { startIndex, endIndex } = timeScale.getVisibleRange(plotWidth, candles.length);
    const halfWidth = Math.max(1.5, Math.floor(timeScale.barWidth / 2));

    const upColor = '#089981';
    const downColor = '#f23645';

    ctx.lineWidth = 1;

    for (let i = startIndex; i <= endIndex; i++) {
      const c = candles[i];
      if (!c) continue;

      const x = Math.floor(timeScale.indexToX(i)) + 0.5;
      const isUp = c.close >= c.open;
      const color = isUp ? upColor : downColor;

      const yHigh = Math.floor(priceScale.priceToY(c.high, plotHeight));
      const yLow = Math.floor(priceScale.priceToY(c.low, plotHeight));
      const yOpen = Math.floor(priceScale.priceToY(c.open, plotHeight)) + 0.5;
      const yClose = Math.floor(priceScale.priceToY(c.close, plotHeight)) + 0.5;

      ctx.strokeStyle = color;

      // Vertical spine
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Open tick (left)
      ctx.beginPath();
      ctx.moveTo(x - halfWidth, yOpen);
      ctx.lineTo(x, yOpen);
      ctx.stroke();

      // Close tick (right)
      ctx.beginPath();
      ctx.moveTo(x, yClose);
      ctx.lineTo(x + halfWidth, yClose);
      ctx.stroke();
    }
  }
}
