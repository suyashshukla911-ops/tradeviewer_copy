import type { Drawing } from './Drawing';
import type { Candle } from '../models/Candle';
import { TimeScale } from '../core/TimeScale';
import { PriceScale } from '../core/PriceScale';
import { timeToIndex } from './TrendLine';

export type HitType = 'handle-p1' | 'handle-p2' | 'body';

export interface HitTestResult {
  drawing: Drawing;
  hitType: HitType;
}

export class DrawingHitTest {
  private static readonly HANDLE_RADIUS_SQ = 64; // 8px radius
  private static readonly LINE_TOLERANCE_SQ = 49; // 7px tolerance

  /**
   * Distance squared from point P(px, py) to line segment A(x1, y1) -> B(x2, y2)
   */
  public static distSqToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      const ddx = px - x1;
      const ddy = py - y1;
      return ddx * ddx + ddy * ddy;
    }

    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const ddx = px - projX;
    const ddy = py - projY;
    return ddx * ddx + ddy * ddy;
  }

  /**
   * Tests all drawings in reverse order (topmost first) for a hit at (mouseX, mouseY).
   */
  public static test(
    drawings: Drawing[],
    mouseX: number,
    mouseY: number,
    candles: Candle[],
    timeScale: TimeScale,
    priceScale: PriceScale,
    plotWidth: number,
    plotHeight: number
  ): HitTestResult | null {
    if (drawings.length === 0 || plotWidth <= 0 || plotHeight <= 0) return null;

    // Check in reverse order so top-most drawings get precedence
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];

      if (d.type === 'trendline' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const idx1 = timeToIndex(p1.time, candles);
        const idx2 = timeToIndex(p2.time, candles);
        const x1 = timeScale.indexToX(idx1);
        const y1 = priceScale.priceToY(p1.price, plotHeight);
        const x2 = timeScale.indexToX(idx2);
        const y2 = priceScale.priceToY(p2.price, plotHeight);

        // 1. Check handle P1
        const d1Sq = (mouseX - x1) ** 2 + (mouseY - y1) ** 2;
        if (d1Sq <= this.HANDLE_RADIUS_SQ) {
          return { drawing: d, hitType: 'handle-p1' };
        }

        // 2. Check handle P2
        const d2Sq = (mouseX - x2) ** 2 + (mouseY - y2) ** 2;
        if (d2Sq <= this.HANDLE_RADIUS_SQ) {
          return { drawing: d, hitType: 'handle-p2' };
        }

        // 3. Check line body
        const distSq = this.distSqToSegment(mouseX, mouseY, x1, y1, x2, y2);
        if (distSq <= this.LINE_TOLERANCE_SQ) {
          return { drawing: d, hitType: 'body' };
        }
      } else if (d.type === 'horizontal' && d.points.length >= 1) {
        const p = d.points[0];
        const y = priceScale.priceToY(p.price, plotHeight);

        // Check horizontal span and vertical distance
        if (mouseX >= 0 && mouseX <= plotWidth && Math.abs(mouseY - y) <= 7) {
          return { drawing: d, hitType: 'body' };
        }
      } else if (d.type === 'measure' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const idx1 = timeToIndex(p1.time, candles);
        const idx2 = timeToIndex(p2.time, candles);
        const x1 = timeScale.indexToX(idx1);
        const y1 = priceScale.priceToY(p1.price, plotHeight);
        const x2 = timeScale.indexToX(idx2);
        const y2 = priceScale.priceToY(p2.price, plotHeight);

        // 1. Check handle P1
        const d1Sq = (mouseX - x1) ** 2 + (mouseY - y1) ** 2;
        if (d1Sq <= this.HANDLE_RADIUS_SQ) {
          return { drawing: d, hitType: 'handle-p1' };
        }

        // 2. Check handle P2
        const d2Sq = (mouseX - x2) ** 2 + (mouseY - y2) ** 2;
        if (d2Sq <= this.HANDLE_RADIUS_SQ) {
          return { drawing: d, hitType: 'handle-p2' };
        }

        // 3. Check diagonal ray
        const distDiagSq = this.distSqToSegment(mouseX, mouseY, x1, y1, x2, y2);
        if (distDiagSq <= this.LINE_TOLERANCE_SQ) {
          return { drawing: d, hitType: 'body' };
        }

        // 4. Check bounding box interior or borders
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);

        if (
          mouseX >= left - 4 &&
          mouseX <= right + 4 &&
          mouseY >= top - 4 &&
          mouseY <= bottom + 4
        ) {
          return { drawing: d, hitType: 'body' };
        }
      }
    }

    return null;
  }
}
