import type { TimeTick } from '../core/TimeScale';

export class TimeScaleRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeTicks: TimeTick[]
  ): void {
    if (width <= 0 || height <= 0) return;

    // Background
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, width, height);

    // Top border dividing plot and time scale
    ctx.strokeStyle = '#2a2e39';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(width, 0.5);
    ctx.stroke();

    // Font settings
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
    ctx.fillStyle = '#787b86';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw time scale ticks and labels
    for (const tick of timeTicks) {
      const x = Math.floor(tick.x) + 0.5;

      // Small tick notch
      ctx.strokeStyle = '#2a2e39';
      ctx.beginPath();
      ctx.moveTo(x, 0.5);
      ctx.lineTo(x, 4.5);
      ctx.stroke();

      // Tick label
      ctx.fillStyle = '#787b86';
      ctx.fillText(tick.label, x, height / 2 + 2);
    }
  }
}
