export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  isEraser?: boolean;
}

export interface RecognitionResult {
  expression: string;
  result: string;
  position: { x: number; y: number };
}