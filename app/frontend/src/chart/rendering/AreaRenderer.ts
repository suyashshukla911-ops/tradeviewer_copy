import type { Candle } from '../models/Candle';
import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';

export class AreaRenderer {
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
    if (startIndex > endIndex) return;

    const points: Array<{ x: number; y: number }> = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const c = candles[i];
      if (!c) continue;
      const x = timeScale.indexToX(i);
      const y = priceScale.priceToY(c.close, plotHeight);
      points.push({ x, y });
    }

    if (points.length === 0) return;

    // 1. Draw gradient area fill
    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, 0, plotHeight);
    gradient.addColorStop(0, 'rgba(41, 98, 255, 0.38)');
    gradient.addColorStop(0.7, 'rgba(41, 98, 255, 0.10)');
    gradient.addColorStop(1, 'rgba(41, 98, 255, 0.00)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, plotHeight);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.lineTo(points[points.length - 1].x, plotHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 2. Draw line on top
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.strokeStyle = '#2962ff';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();
  }
}
