import { TimeScale } from '../../core/TimeScale';
import type { RSIResult } from '../../indicators/Indicator';

export class RSIRenderer {
  public static rsiToY(val: number, height: number): number {
    // 0 is at bottom (height), 100 is at top (0)
    // Add small 8% margin top and bottom so 100 and 0 are not clipped
    const margin = height * 0.08;
    const usableHeight = height - 2 * margin;
    const ratio = Math.max(0, Math.min(100, val)) / 100;
    return margin + (1 - ratio) * usableHeight;
  }

  public static yToRsi(y: number, height: number): number {
    const margin = height * 0.08;
    const usableHeight = height - 2 * margin;
    const ratio = 1 - (y - margin) / usableHeight;
    return Math.max(0, Math.min(100, ratio * 100));
  }

  public static render(
    plotCtx: CanvasRenderingContext2D,
    scaleCtx: CanvasRenderingContext2D,
    result: RSIResult,
    timeScale: TimeScale,
    plotWidth: number,
    plotHeight: number,
    scaleWidth: number,
    color: string = '#8b5cf6',
    overbought: number = 70,
    center: number = 50,
    oversold: number = 30
  ): void {
    if (plotWidth <= 0 || plotHeight <= 0) return;

    const { values } = result;

    // 1. Clear backgrounds
    plotCtx.fillStyle = '#131722';
    plotCtx.fillRect(0, 0, plotWidth, plotHeight);

    scaleCtx.fillStyle = '#131722';
    scaleCtx.fillRect(0, 0, scaleWidth, plotHeight);

    // Left border on scale
    scaleCtx.strokeStyle = '#2a2e39';
    scaleCtx.lineWidth = 1;
    scaleCtx.beginPath();
    scaleCtx.moveTo(0.5, 0);
    scaleCtx.lineTo(0.5, plotHeight);
    scaleCtx.stroke();

    const yOver = this.rsiToY(overbought, plotHeight);
    const yCenter = this.rsiToY(center, plotHeight);
    const yUnder = this.rsiToY(oversold, plotHeight);

    // 2. Shaded band between oversold and overbought
    plotCtx.save();
    plotCtx.fillStyle = 'rgba(139, 92, 246, 0.06)';
    plotCtx.fillRect(0, yOver, plotWidth, yUnder - yOver);

    // 3. Horizontal Guide Lines on plot
    plotCtx.strokeStyle = '#2a2e39';
    plotCtx.lineWidth = 1;
    plotCtx.setLineDash([3, 3]);

    // Overbought line
    plotCtx.beginPath();
    plotCtx.moveTo(0, yOver);
    plotCtx.lineTo(plotWidth, yOver);
    plotCtx.stroke();

    // Center line
    plotCtx.setLineDash([2, 4]);
    plotCtx.beginPath();
    plotCtx.moveTo(0, yCenter);
    plotCtx.lineTo(plotWidth, yCenter);
    plotCtx.stroke();

    // Oversold line
    plotCtx.setLineDash([3, 3]);
    plotCtx.beginPath();
    plotCtx.moveTo(0, yUnder);
    plotCtx.lineTo(plotWidth, yUnder);
    plotCtx.stroke();

    // 4. RSI Curve
    const { startIndex, endIndex } = timeScale.getVisibleRange(plotWidth, values.length);
    plotCtx.setLineDash([]);
    plotCtx.strokeStyle = color;
    plotCtx.lineWidth = 1.5;
    plotCtx.lineJoin = 'round';
    plotCtx.lineCap = 'round';

    let started = false;
    plotCtx.beginPath();

    for (let i = startIndex; i <= endIndex; i++) {
      const val = values[i];
      if (val === null || val === undefined) {
        started = false;
        continue;
      }

      const x = timeScale.indexToX(i);
      const y = this.rsiToY(val, plotHeight);

      if (!started) {
        plotCtx.moveTo(x, y);
        started = true;
      } else {
        plotCtx.lineTo(x, y);
      }
    }

    if (started) {
      plotCtx.stroke();
    }
    plotCtx.restore();

    // 5. RSI Scale labels on right canvas
    scaleCtx.save();
    scaleCtx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
    scaleCtx.fillStyle = '#787b86';
    scaleCtx.textAlign = 'left';
    scaleCtx.textBaseline = 'middle';

    const rsiTicks = [
      { y: yOver, label: String(overbought) },
      { y: yCenter, label: String(center) },
      { y: yUnder, label: String(oversold) },
    ];

    for (const t of rsiTicks) {
      scaleCtx.beginPath();
      scaleCtx.moveTo(0.5, t.y);
      scaleCtx.lineTo(4.5, t.y);
      scaleCtx.strokeStyle = '#2a2e39';
      scaleCtx.stroke();

      scaleCtx.fillText(t.label, 8, t.y);
    }

    // Latest RSI value pill badge
    const lastVal = values.length > 0 ? values[values.length - 1] : null;
    if (lastVal !== null && lastVal !== undefined) {
      const yLast = this.rsiToY(lastVal, plotHeight);
      const badgeH = 16;
      const badgeW = scaleWidth - 4;
      const badgeY = Math.max(badgeH / 2, Math.min(plotHeight - badgeH / 2, yLast));

      scaleCtx.fillStyle = color;
      scaleCtx.beginPath();
      scaleCtx.roundRect(2, badgeY - badgeH / 2, badgeW, badgeH, 2);
      scaleCtx.fill();

      scaleCtx.fillStyle = '#ffffff';
      scaleCtx.textAlign = 'center';
      scaleCtx.textBaseline = 'middle';
      scaleCtx.fillText(lastVal.toFixed(1), 2 + badgeW / 2, badgeY);
    }
    scaleCtx.restore();
  }

  /**
   * Render hover crosshair value pill on RSI scale canvas
   */
  public static renderHoverBadge(
    scaleCtx: CanvasRenderingContext2D,
    mouseY: number,
    plotHeight: number,
    scaleWidth: number,
    color: string = '#8b5cf6'
  ): void {
    const rsiVal = this.yToRsi(mouseY, plotHeight);
    const badgeH = 16;
    const badgeW = scaleWidth - 4;
    const badgeY = Math.max(badgeH / 2, Math.min(plotHeight - badgeH / 2, mouseY));

    scaleCtx.save();
    scaleCtx.fillStyle = color;
    scaleCtx.beginPath();
    scaleCtx.roundRect(2, badgeY - badgeH / 2, badgeW, badgeH, 2);
    scaleCtx.fill();

    scaleCtx.fillStyle = '#ffffff';
    scaleCtx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
    scaleCtx.textAlign = 'center';
    scaleCtx.textBaseline = 'middle';
    scaleCtx.fillText(rsiVal.toFixed(1), 2 + badgeW / 2, badgeY);
    scaleCtx.restore();
  }
}
