import type { Candle } from '../models/Candle';
import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';
import type { CrosshairPoint } from '../models/ChartState';

export class CrosshairController {
  public static render(
    plotCtx: CanvasRenderingContext2D,
    priceCtx: CanvasRenderingContext2D,
    timeCtx: CanvasRenderingContext2D,
    plotWidth: number,
    plotHeight: number,
    priceScaleWidth: number,
    timeScaleHeight: number,
    mouseX: number,
    mouseY: number,
    timeScale: TimeScale,
    priceScale: PriceScale,
    candles: Candle[]
  ): CrosshairPoint | null {
    // Clear all 3 interaction overlay canvases
    plotCtx.clearRect(0, 0, plotWidth, plotHeight);
    priceCtx.clearRect(0, 0, priceScaleWidth, plotHeight);
    timeCtx.clearRect(0, 0, plotWidth, timeScaleHeight);

    if (mouseX < 0 || mouseX > plotWidth || mouseY < 0 || mouseY > plotHeight || candles.length === 0) {
      return null;
    }

    // 1. Calculate nearest bar index and snapped candle
    const rawIndex = Math.round(timeScale.xToIndex(mouseX));
    const clampedIndex = Math.max(0, Math.min(candles.length - 1, rawIndex));
    const candle = candles[clampedIndex];

    const snappedX = Math.floor(timeScale.indexToX(clampedIndex)) + 0.5;
    const currentY = Math.floor(mouseY) + 0.5;
    const currentPrice = priceScale.yToPrice(mouseY, plotHeight);

    // 2. Draw crosshair lines on plot overlay canvas
    plotCtx.save();
    plotCtx.strokeStyle = 'rgba(219, 222, 227, 0.5)';
    plotCtx.lineWidth = 1;
    plotCtx.setLineDash([4, 4]);

    // Horizontal line
    plotCtx.beginPath();
    plotCtx.moveTo(0, currentY);
    plotCtx.lineTo(plotWidth, currentY);
    plotCtx.stroke();

    // Vertical line
    plotCtx.beginPath();
    plotCtx.moveTo(snappedX, 0);
    plotCtx.lineTo(snappedX, plotHeight);
    plotCtx.stroke();
    plotCtx.restore();

    // 3. Draw price badge on Price Scale overlay canvas
    priceCtx.save();
    const priceText = currentPrice.toFixed(2);
    priceCtx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    const textWidth = priceCtx.measureText(priceText).width;
    const badgeW = textWidth + 10;
    const badgeH = 18;
    const badgeY = Math.max(badgeH / 2, Math.min(plotHeight - badgeH / 2, mouseY));

    // Pill background
    priceCtx.fillStyle = '#2962ff';
    priceCtx.beginPath();
    priceCtx.roundRect(2, badgeY - badgeH / 2, badgeW, badgeH, 3);
    priceCtx.fill();

    // Text
    priceCtx.fillStyle = '#ffffff';
    priceCtx.textAlign = 'center';
    priceCtx.textBaseline = 'middle';
    priceCtx.fillText(priceText, 2 + badgeW / 2, badgeY);
    priceCtx.restore();

    // 4. Draw date/time badge on Time Scale overlay canvas
    timeCtx.save();
    const dateObj = new Date(candle.time * 1000);
    const isIntraday = candles.length > 1 && Math.abs(candles[1].time - candles[0].time) < 86400;
    const dateText = timeScale.formatFullDate(dateObj, isIntraday);
    timeCtx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    const timeTextWidth = timeCtx.measureText(dateText).width;
    const timeBadgeW = timeTextWidth + 12;
    const timeBadgeH = 20;
    const timeBadgeX = Math.max(timeBadgeW / 2, Math.min(plotWidth - timeBadgeW / 2, snappedX));

    // Pill background
    timeCtx.fillStyle = '#2962ff';
    timeCtx.beginPath();
    timeCtx.roundRect(timeBadgeX - timeBadgeW / 2, 4, timeBadgeW, timeBadgeH, 3);
    timeCtx.fill();

    // Text
    timeCtx.fillStyle = '#ffffff';
    timeCtx.textAlign = 'center';
    timeCtx.textBaseline = 'middle';
    timeCtx.fillText(dateText, timeBadgeX, 4 + timeBadgeH / 2);
    timeCtx.restore();

    return {
      x: snappedX,
      y: currentY,
      price: currentPrice,
      time: candle.time,
      barIndex: clampedIndex,
      candle,
      visible: true,
    };
  }

  public static clear(
    plotCtx: CanvasRenderingContext2D | null,
    priceCtx: CanvasRenderingContext2D | null,
    timeCtx: CanvasRenderingContext2D | null,
    plotWidth: number,
    plotHeight: number,
    priceScaleWidth: number,
    timeScaleHeight: number
  ): void {
    plotCtx?.clearRect(0, 0, plotWidth, plotHeight);
    priceCtx?.clearRect(0, 0, priceScaleWidth, plotHeight);
    timeCtx?.clearRect(0, 0, plotWidth, timeScaleHeight);
  }

  public static renderTimeBadge(
    timeCtx: CanvasRenderingContext2D,
    plotWidth: number,
    timeScaleHeight: number,
    x: number,
    time: number,
    timeScale: TimeScale,
    isIntraday: boolean = false
  ): void {
    timeCtx.clearRect(0, 0, plotWidth, timeScaleHeight);
    timeCtx.save();
    const dateObj = new Date(time * 1000);
    const dateText = timeScale.formatFullDate(dateObj, isIntraday);
    timeCtx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    const timeTextWidth = timeCtx.measureText(dateText).width;
    const timeBadgeW = timeTextWidth + 12;
    const timeBadgeH = 20;
    const timeBadgeX = Math.max(timeBadgeW / 2, Math.min(plotWidth - timeBadgeW / 2, x));

    timeCtx.fillStyle = '#2962ff';
    timeCtx.beginPath();
    timeCtx.roundRect(timeBadgeX - timeBadgeW / 2, 4, timeBadgeW, timeBadgeH, 3);
    timeCtx.fill();

    timeCtx.fillStyle = '#ffffff';
    timeCtx.textAlign = 'center';
    timeCtx.textBaseline = 'middle';
    timeCtx.fillText(dateText, timeBadgeX, 4 + timeBadgeH / 2);
    timeCtx.restore();
  }
}
