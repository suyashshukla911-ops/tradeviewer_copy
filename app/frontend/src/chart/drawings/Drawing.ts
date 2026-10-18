export type DrawingType = 'trendline' | 'horizontal' | 'measure';

export interface DataPoint {
  time: number;  // Unix timestamp in seconds
  price: number; // Price value
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: DataPoint[]; // 1 point for horizontal, 2 points for trendline & measure
  color?: string;
  lineWidth?: number;
  selected?: boolean;
  hovered?: boolean;
}
