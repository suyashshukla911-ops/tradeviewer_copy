import type { Candle } from '../models/Candle';
import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';

export class HollowCandleRenderer {
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
    const barWidth = timeScale.barWidth;
    const halfWidth = Math.max(0.5, Math.floor(barWidth / 2));

    const upColor = '#089981'; // Green
    const downColor = '#f23645'; // Red

    for (let i = startIndex; i <= endIndex; i++) {
      const c = candles[i];
      if (!c) continue;

      const x = Math.floor(timeScale.indexToX(i));
      const isHollow = c.close >= c.open;
      const isUp = i > 0 ? c.close >= candles[i - 1].close : isHollow;
      const color = isUp ? upColor : downColor;

      const yHigh = Math.floor(priceScale.priceToY(c.high, plotHeight));
      const yLow = Math.floor(priceScale.priceToY(c.low, plotHeight));
      const yOpen = Math.floor(priceScale.priceToY(c.open, plotHeight));
      const yClose = Math.floor(priceScale.priceToY(c.close, plotHeight));

      const yBodyTop = Math.min(yOpen, yClose);
      const yBodyBottom = Math.max(yOpen, yClose);
      const bodyHeight = Math.max(1, yBodyBottom - yBodyTop);

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      // Draw wick
      ctx.beginPath();
      ctx.moveTo(x + 0.5, yHigh);
      ctx.lineTo(x + 0.5, yLow);
      ctx.lineWidth = 1;
      ctx.stroke();

      if (isHollow) {
        // Hollow body: clear background rect to avoid wick showing through, then stroke border
        ctx.fillStyle = '#131722';
        ctx.fillRect(x - halfWidth + 1, yBodyTop + 1, Math.max(1, barWidth - 2), Math.max(1, bodyHeight - 2));

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - halfWidth + 0.5, yBodyTop + 0.5, Math.max(1, barWidth - 1), bodyHeight);
      } else {
        // Solid body
        ctx.fillStyle = color;
        ctx.fillRect(x - halfWidth, yBodyTop, barWidth, bodyHeight);
      }
    }
  }
}
