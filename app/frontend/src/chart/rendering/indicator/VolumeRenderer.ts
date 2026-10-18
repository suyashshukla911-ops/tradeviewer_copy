import { TimeScale } from '../../core/TimeScale';
import type { VolumeResult } from '../../indicators/Indicator';

export class VolumeRenderer {
  public static formatVolume(v: number): string {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toString();
  }

  public static render(
    plotCtx: CanvasRenderingContext2D,
    scaleCtx: CanvasRenderingContext2D,
    result: VolumeResult,
    timeScale: TimeScale,
    plotWidth: number,
    plotHeight: number,
    scaleWidth: number
  ): void {
    if (plotWidth <= 0 || plotHeight <= 0) return;

    const { volumes, colors, ma } = result;
    const len = volumes.length;
    if (len === 0) return;

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

    const { startIndex, endIndex } = timeScale.getVisibleRange(plotWidth, len);
    if (startIndex > endIndex) return;

    // Find max volume in visible range
    let maxVol = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      if (volumes[i] > maxVol) maxVol = volumes[i];
      if (ma[i] && (ma[i] as number) > maxVol) maxVol = ma[i] as number;
    }
    if (maxVol <= 0) maxVol = 1;
    // Add 10% headroom
    maxVol *= 1.1;

    const barWidth = timeScale.barWidth;
    const halfWidth = Math.max(0.5, Math.floor(barWidth / 2));

    // 2. Draw Volume Bars
    plotCtx.save();
    for (let i = startIndex; i <= endIndex; i++) {
      const v = volumes[i];
      const x = Math.floor(timeScale.indexToX(i));
      const barH = Math.max(1, Math.floor((v / maxVol) * plotHeight));
      const y = plotHeight - barH;

      plotCtx.fillStyle = colors[i];
      plotCtx.globalAlpha = 0.65;
      plotCtx.fillRect(x - halfWidth, y, barWidth, barH);
    }
    plotCtx.globalAlpha = 1.0;

    // 3. Draw Volume MA Line
    plotCtx.strokeStyle = '#f59e0b';
    plotCtx.lineWidth = 1.5;
    plotCtx.lineJoin = 'round';
    plotCtx.beginPath();
    let maStarted = false;

    for (let i = startIndex; i <= endIndex; i++) {
      const maVal = ma[i];
      if (maVal !== null && maVal !== undefined) {
        const x = timeScale.indexToX(i);
        const y = plotHeight - (maVal / maxVol) * plotHeight;
        if (!maStarted) {
          plotCtx.moveTo(x, y);
          maStarted = true;
        } else {
          plotCtx.lineTo(x, y);
        }
      }
    }
    if (maStarted) {
      plotCtx.stroke();
    }
    plotCtx.restore();

    // 4. Volume scale on right canvas
    scaleCtx.save();
    scaleCtx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
    scaleCtx.fillStyle = '#787b86';
    scaleCtx.textAlign = 'left';
    scaleCtx.textBaseline = 'middle';

    const maxText = this.formatVolume(maxVol);
    const midText = this.formatVolume(maxVol / 2);

    scaleCtx.fillText(maxText, 8, 12);
    scaleCtx.fillText(midText, 8, plotHeight / 2);
    scaleCtx.restore();
  }

  /**
   * Render hover crosshair value pill on Volume scale canvas
   */
  public static renderHoverBadge(
    scaleCtx: CanvasRenderingContext2D,
    mouseY: number,
    plotHeight: number,
    scaleWidth: number,
    maxVol: number
  ): void {
    if (plotHeight <= 0 || maxVol <= 0) return;
    const ratio = Math.max(0, Math.min(1, 1 - mouseY / plotHeight));
    const volVal = ratio * maxVol;
    const text = this.formatVolume(volVal);

    const badgeH = 16;
    const badgeW = scaleWidth - 4;
    const badgeY = Math.max(badgeH / 2, Math.min(plotHeight - badgeH / 2, mouseY));

    scaleCtx.save();
    scaleCtx.fillStyle = '#f59e0b';
    scaleCtx.beginPath();
    scaleCtx.roundRect(2, badgeY - badgeH / 2, badgeW, badgeH, 2);
    scaleCtx.fill();

    scaleCtx.fillStyle = '#1e222d';
    scaleCtx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
    scaleCtx.textAlign = 'center';
    scaleCtx.textBaseline = 'middle';
    scaleCtx.fillText(text, 2 + badgeW / 2, badgeY);
    scaleCtx.restore();
  }
}
