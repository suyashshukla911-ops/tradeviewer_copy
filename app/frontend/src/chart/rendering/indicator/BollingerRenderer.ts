import { TimeScale } from '../../core/TimeScale';
import { PriceScale } from '../../core/PriceScale';
import type { BollingerResult } from '../../indicators/Indicator';

export class BollingerRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    result: BollingerResult,
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number,
    color: string = '#a855f7'
  ): void {
    const { middle, upper, lower } = result;
    const len = middle.length;
    if (len === 0 || plotWidth <= 0 || plotHeight <= 0) return;

    const { startIndex, endIndex } = timeScale.getVisibleRange(plotWidth, len);
    if (startIndex > endIndex) return;

    // Collect upper and lower points for shaded cloud
    const upperPoints: { x: number; y: number }[] = [];
    const lowerPoints: { x: number; y: number }[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const u = upper[i];
      const l = lower[i];
      if (u !== null && l !== null && u !== undefined && l !== undefined) {
        const x = timeScale.indexToX(i);
        const yU = priceScale.priceToY(u, plotHeight);
        const yL = priceScale.priceToY(l, plotHeight);
        upperPoints.push({ x, y: yU });
        lowerPoints.push({ x, y: yL });
      }
    }

    ctx.save();

    // 1. Fill cloud between Upper and Lower bands
    if (upperPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(upperPoints[0].x, upperPoints[0].y);
      for (let i = 1; i < upperPoints.length; i++) {
        ctx.lineTo(upperPoints[i].x, upperPoints[i].y);
      }
      for (let i = lowerPoints.length - 1; i >= 0; i--) {
        ctx.lineTo(lowerPoints[i].x, lowerPoints[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
      ctx.fill();
    }

    // 2. Draw Upper Band Line
    if (upperPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(upperPoints[0].x, upperPoints[0].y);
      for (let i = 1; i < upperPoints.length; i++) {
        ctx.lineTo(upperPoints[i].x, upperPoints[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 3. Draw Lower Band Line
    if (lowerPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(lowerPoints[0].x, lowerPoints[0].y);
      for (let i = 1; i < lowerPoints.length; i++) {
        ctx.lineTo(lowerPoints[i].x, lowerPoints[i].y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 4. Draw Middle Moving Average Line (dashed or solid)
    ctx.beginPath();
    let midStarted = false;
    for (let i = startIndex; i <= endIndex; i++) {
      const m = middle[i];
      if (m !== null && m !== undefined) {
        const x = timeScale.indexToX(i);
        const y = priceScale.priceToY(m, plotHeight);
        if (!midStarted) {
          ctx.moveTo(x, y);
          midStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    if (midStarted) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
    }

    ctx.restore();
  }
}
