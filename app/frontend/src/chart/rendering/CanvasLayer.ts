import { CoordinateSystem } from '../core/CoordinateSystem';

export class CanvasLayer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D | null = null;
  public width: number = 0;
  public height: number = 0;
  public dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  public resize(width: number, height: number, dpr: number = window.devicePixelRatio || 1): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.ctx = CoordinateSystem.setupCanvas(this.canvas, width, height, dpr);
  }

  public clear(): void {
    if (!this.ctx || this.width <= 0 || this.height <= 0) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
