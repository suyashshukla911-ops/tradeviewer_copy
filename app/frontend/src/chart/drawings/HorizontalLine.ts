import type { Drawing } from './Drawing';
import { PriceScale } from '../core/PriceScale';

export class HorizontalLine {
  public static render(
    ctx: CanvasRenderingContext2D,
    drawing: Drawing,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number
  ): void {
    if (drawing.points.length < 1) return;

    const p = drawing.points[0];
    const y = Math.floor(priceScale.priceToY(p.price, plotHeight)) + 0.5;

    const isSelected = !!drawing.selected;
    const isHovered = !!drawing.hovered;

    ctx.save();
    ctx.strokeStyle = drawing.color || '#f59e0b';
    ctx.lineWidth = (drawing.lineWidth || 1.5) + (isSelected ? 1 : isHovered ? 0.5 : 0);
    ctx.setLineDash(isSelected ? [] : [4, 4]);

    if (isSelected) {
      ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
      ctx.shadowBlur = 6;
    }

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(plotWidth, y);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Price tag on the line
    const text = p.price.toFixed(2);
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif';
    const textW = ctx.measureText(text).width;

    ctx.setLineDash([]);
    ctx.fillStyle = drawing.color || '#f59e0b';
    ctx.fillRect(8, y - 8, textW + 8, 16);

    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, y - 8, textW + 8, 16);
    }

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 8 + (textW + 8) / 2, y);

    // If selected, draw handles at center and sides
    if (isSelected) {
      const handlePositions = [plotWidth * 0.25, plotWidth * 0.5, plotWidth * 0.75];
      for (const hx of handlePositions) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = drawing.color || '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hx, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
