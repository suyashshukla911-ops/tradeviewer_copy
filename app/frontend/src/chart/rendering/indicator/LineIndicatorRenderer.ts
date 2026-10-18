import { TimeScale } from '../../core/TimeScale';
import { PriceScale } from '../../core/PriceScale';

export class LineIndicatorRenderer {
  public static render(
    ctx: CanvasRenderingContext2D,
    values: (number | null)[],
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number,
    color: string = '#f59e0b',
    lineWidth: number = 1.5
  ): void {
    if (values.length === 0 || plotWidth <= 0 || plotHeight <= 0) return;

    const { startIndex, endIndex } = timeScale.getVisibleRange(plotWidth, values.length);
    if (startIndex > endIndex) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    let started = false;
    ctx.beginPath();

    for (let i = startIndex; i <= endIndex; i++) {
      const val = values[i];
      if (val === null || val === undefined) {
        started = false;
        continue;
      }

      const x = timeScale.indexToX(i);
      const y = priceScale.priceToY(val, plotHeight);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    if (started) {
      ctx.stroke();
    }

    ctx.restore();
  }
}
