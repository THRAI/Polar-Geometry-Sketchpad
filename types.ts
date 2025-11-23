
export enum ToolType {
  SELECT = 'SELECT',
  POINT = 'POINT',
  LINE = 'LINE',
  CONIC = 'CONIC',
  POLAR = 'POLAR',
  TRIANGLE = 'TRIANGLE',
  INTERSECT = 'INTERSECT',
  ERASER = 'ERASER',
}

export enum ObjectType {
  POINT = 'POINT',
  LINE = 'LINE',
  CONIC = 'CONIC',
}

export enum ConicType {
  ELLIPSE = 'ELLIPSE',
  HYPERBOLA = 'HYPERBOLA',
  PARABOLA = 'PARABOLA',
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface GeoObject {
  id: string;
  type: ObjectType;
  name: string;
  color: string;
  hidden?: boolean;
  dependencies?: string[]; // IDs of objects this depends on
}

export interface GeoPoint extends GeoObject {
  type: ObjectType.POINT;
  x: number;
  y: number;
  isFree: boolean;
  // If constrained to a line
  onLineId?: string;
  // If it is one of multiple intersection solutions (e.g. Line-Conic has 2 points)
  solutionIndex?: number; 
}

export interface GeoLine extends GeoObject {
  type: ObjectType.LINE;
  // Equation: ax + by + c = 0
  a: number;
  b: number;
  c: number;
  isFree: boolean;
  // Defined by two points
  p1Id?: string;
  p2Id?: string;
  // Defined by passing through a point with angle (if free but pivot)
  pivotPointId?: string;
  angle?: number;
}

export interface GeoConic extends GeoObject {
  type: ObjectType.CONIC;
  conicType: ConicType;
  // Standard parameters for rendering and editing
  cx: number;
  cy: number;
  a: number; // semi-major / distance
  b: number; // semi-minor (for ellipse/hyperbola)
  rotation: number; // radians
  
  // General Equation Coefficients: Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0
  // These are derived from the standard params usually, but needed for polar calculation
  coeffs: { A: number; B: number; C: number; D: number; E: number; F: number };
}

export type GeoEntity = GeoPoint | GeoLine | GeoConic;