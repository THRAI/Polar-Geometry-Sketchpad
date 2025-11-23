export const COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

export const DEFAULT_VIEWBOX = {
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  scale: 1, // pixels per unit
};

// Matrix 3x3 helper for Polar calculations
// M = [A, B/2, D/2; B/2, C, E/2; D/2, E/2, F]
