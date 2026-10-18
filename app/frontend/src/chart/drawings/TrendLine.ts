import type { Drawing } from './Drawing';
import type { Candle } from '../models/Candle';
import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';

export function timeToIndex(time: number, candles: Candle[]): number {
  if (candles.length === 0) return 0;
  if (candles.length === 1) return 0;

  const firstTime = candles[0].time;
  const lastTime = candles[candles.length - 1].time;
  const avgStep = (lastTime - firstTime) / (candles.length - 1);

  if (time < firstTime && avgStep > 0) {
    return (time - firstTime) / avgStep;
  }
  if (time > lastTime && avgStep > 0) {
    return candles.length - 1 + (time - lastTime) / avgStep;
  }

  // Binary search for closest
  let low = 0;
  let high = candles.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (candles[mid].time === time) return mid;
    if (candles[mid].time < time) low = mid + 1;
    else high = mid - 1;
  }
  return Math.max(0, Math.min(candles.length - 1, low));
}

export class TrendLine {
  public static render(
    ctx: CanvasRenderingContext2D,
    drawing: Drawing,
    candles: Candle[],
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotHeight: number
  ): void {
    if (drawing.points.length < 2) return;

    const p1 = drawing.points[0];
    const p2 = drawing.points[1];

    const idx1 = timeToIndex(p1.time, candles);
    const idx2 = timeToIndex(p2.time, candles);

    const x1 = timeScale.indexToX(idx1);
    const y1 = priceScale.priceToY(p1.price, plotHeight);
    const x2 = timeScale.indexToX(idx2);
    const y2 = priceScale.priceToY(p2.price, plotHeight);

    ctx.save();
    const isSelected = !!drawing.selected;
    const isHovered = !!drawing.hovered;

    ctx.strokeStyle = drawing.color || '#2962ff';
    ctx.lineWidth = (drawing.lineWidth || 2) + (isSelected ? 1 : isHovered ? 0.5 : 0);
    ctx.lineCap = 'round';

    if (isSelected) {
      ctx.shadowColor = 'rgba(41, 98, 255, 0.4)';
      ctx.shadowBlur = 6;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // End points / handles
    const handleRadius = isSelected ? 5.5 : 4;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = isSelected ? '#2962ff' : (drawing.color || '#2962ff');
    ctx.lineWidth = isSelected ? 2.5 : 2;

    ctx.beginPath();
    ctx.arc(x1, y1, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x2, y2, handleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // If selected, draw outer accent ring around handles
    if (isSelected) {
      ctx.strokeStyle = 'rgba(41, 98, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x1, y1, handleRadius + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x2, y2, handleRadius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
