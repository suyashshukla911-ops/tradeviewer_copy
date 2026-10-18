import type { Drawing } from './Drawing';
import type { Candle } from '../models/Candle';
import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';
import { timeToIndex } from './TrendLine';

export class MeasurementTool {
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

    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    const deltaPrice = p2.price - p1.price;
    const deltaPct = p1.price > 0 ? (deltaPrice / p1.price) * 100 : 0;
    const barCount = Math.round(Math.abs(idx2 - idx1));
    const isUp = deltaPrice >= 0;

    const fillColor = isUp ? 'rgba(8, 153, 129, 0.16)' : 'rgba(242, 54, 69, 0.16)';
    const borderColor = isUp ? '#089981' : '#f23645';

    ctx.save();

    // 1. Fill measurement bounding box
    ctx.fillStyle = fillColor;
    ctx.fillRect(left, top, width, height);

    const isSelected = !!drawing.selected;
    const isHovered = !!drawing.hovered;

    // 2. Stroke boundary
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isSelected ? 1.5 : isHovered ? 1.2 : 1;
    ctx.setLineDash(isSelected ? [] : [2, 2]);
    ctx.strokeRect(left, top, width, height);

    // 3. Diagonal measurement arrow
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.setLineDash([]);
    ctx.stroke();

    // 3b. Endpoint handles when selected
    if (isSelected) {
      const handleRadius = 5;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(x1, y1, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x2, y2, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 4. Center info badge
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const sign = isUp ? '+' : '';
    const badgeText1 = `${sign}${deltaPrice.toFixed(2)} (${sign}${deltaPct.toFixed(2)}%)`;
    const badgeText2 = `${barCount} bars`;

    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
    const textW1 = ctx.measureText(badgeText1).width;
    const textW2 = ctx.measureText(badgeText2).width;
    const cardW = Math.max(textW1, textW2) + 16;
    const cardH = 34;

    ctx.fillStyle = '#1e222d';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(centerX - cardW / 2, centerY - cardH / 2, cardW, cardH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = borderColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText1, centerX, centerY - 6);

    ctx.fillStyle = '#787b86';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
    ctx.fillText(badgeText2, centerX, centerY + 8);

    ctx.restore();
  }
}
