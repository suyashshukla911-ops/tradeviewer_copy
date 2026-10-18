import type { PriceTick } from '../core/PriceScale';
import type { Candle } from '../models/Candle';

export class PriceScaleRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    priceTicks: PriceTick[],
    lastCandle: Candle | null,
    priceToY: (price: number) => number
  ): void {
    if (width <= 0 || height <= 0) return;

    // Background
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, width, height);

    // Left border dividing plot and price scale
    ctx.strokeStyle = '#2a2e39';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0.5, 0);
    ctx.lineTo(0.5, height);
    ctx.stroke();

    // Font settings
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    ctx.fillStyle = '#787b86';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Draw price scale ticks and labels
    for (const tick of priceTicks) {
      const y = Math.floor(tick.y) + 0.5;

      // Small tick notch
      ctx.strokeStyle = '#2a2e39';
      ctx.beginPath();
      ctx.moveTo(0.5, y);
      ctx.lineTo(4.5, y);
      ctx.stroke();

      // Tick label
      ctx.fillStyle = '#787b86';
      ctx.fillText(tick.label, 8, y);
    }

    // Last candle close price highlight badge
    if (lastCandle) {
      const y = priceToY(lastCandle.close);
      if (y >= 0 && y <= height) {
        const isUp = lastCandle.close >= lastCandle.open;
        const color = isUp ? '#089981' : '#f23645';
        const priceText = lastCandle.close.toFixed(2);
        const badgeH = 18;
        const badgeW = width - 4;
        const badgeY = Math.max(badgeH / 2, Math.min(height - badgeH / 2, y));

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(2, badgeY - badgeH / 2, badgeW, badgeH, 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(priceText, 2 + badgeW / 2, badgeY);
      }
    }
  }
}
