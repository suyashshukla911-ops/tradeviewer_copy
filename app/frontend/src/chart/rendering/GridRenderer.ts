import type { TimeTick } from '../core/TimeScale';
import type { PriceTick } from '../core/PriceScale';

export class GridRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeTicks: TimeTick[],
    priceTicks: PriceTick[]
  ): void {
    if (width <= 0 || height <= 0) return;

    // Dark background fill
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = '#222731';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical grid lines
    for (const t of timeTicks) {
      const x = Math.floor(t.x) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (const p of priceTicks) {
      const y = Math.floor(p.y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
