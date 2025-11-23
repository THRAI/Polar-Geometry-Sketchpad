


import { GeoConic, Coordinates, GeoPoint, ConicType } from '../types';

// --- Math Expression Evaluator ---
export const evaluateMathExpression = (expr: string): number | null => {
  if (!expr) return null;
  try {
    let processed = expr.toLowerCase().trim();
    
    // Basic safety check: only allow numbers, operators, and specific math functions
    // We allow: digits . + - * / ^ ( ) and 'sqrt', 'pi', 'e'
    const allowedChars = /^[0-9\.\+\-\*\/\^\(\)\s|sqrt|pi|e|sin|cos|tan]+$/;
    if (!allowedChars.test(processed)) return null;

    processed = processed
      .replace(/\^/g, '**')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/pi/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan');

    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${processed})`);
    const val = fn();
    return typeof val === 'number' && isFinite(val) ? val : null;
  } catch (e) {
    return null;
  }
};

// --- Matrix Helper ---
export const multiplyMatrixVector = (m: number[][], v: number[]) => {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
};

export const getConicMatrix = (conic: GeoConic) => {
  const { A, B, C, D, E, F } = conic.coeffs;
  return [
    [A, B / 2, D / 2],
    [B / 2, C, E / 2],
    [D / 2, E / 2, F],
  ];
};

// --- Polar Calculation ---
// Given a point (x0, y0) and a conic matrix M, the polar line is P^T * M * X = 0
// P = [x0, y0, 1]
// Result is vector [a, b, c] corresponding to ax + by + c = 0
export const calculatePolarLineCoeffs = (px: number, py: number, conic: GeoConic) => {
  const M = getConicMatrix(conic);
  const P = [px, py, 1];
  const L = multiplyMatrixVector(M, P);
  return { a: L[0], b: L[1], c: L[2] };
};

// --- Conic Coefficients Generator ---
// Converts standard parameters (center, axes, rotation) to General Equation
export const updateConicCoefficients = (conic: GeoConic): GeoConic => {
  const { cx, cy, a, b, rotation, conicType } = conic;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  let A, B, C, D, E, F;

  if (conicType === 'ELLIPSE' || conicType === 'HYPERBOLA') {
    // Standard form centered at 0: x^2/a^2 +/- y^2/b^2 = 1
    const sign = conicType === 'ELLIPSE' ? 1 : -1;
    const A0 = 1 / (a * a);
    const C0 = sign / (b * b);

    // Rotate
    // x' = x cos - y sin
    // y' = x sin + y cos
    // Apply to A0(x')^2 + C0(y')^2 = 1
    const A_rot = A0 * cos * cos + C0 * sin * sin;
    const B_rot = 2 * (A0 - C0) * cos * sin; // coefficient of xy
    const C_rot = A0 * sin * sin + C0 * cos * cos;

    // Translate (-cx, -cy)
    // A(x-cx)^2 + B(x-cx)(y-cy) + C(y-cy)^2 - 1 = 0
    A = A_rot;
    B = B_rot;
    C = C_rot;
    D = -2 * A * cx - B * cy;
    E = -B * cx - 2 * C * cy;
    F = A * cx * cx + B * cx * cy + C * cy * cy - 1;
  } else {
    // PARABOLA
    // Standard vertex at 0,0 opening right: y^2 = 4ax
    const sin2 = sin*sin;
    const cos2 = cos*cos;
    
    A = sin2;
    B = -2 * sin * cos;
    C = cos2;
    
    // Expansion terms
    const L1 = -4 * a * cos;
    const L2 = -4 * a * sin;
    
    D = -2*A*cx - B*cy + L1;
    E = -B*cx - 2*C*cy + L2;
    F = A*cx*cx + B*cx*cy + C*cy*cy - L1*cx - L2*cy;
  }

  return {
    ...conic,
    coeffs: { A, B, C, D, E, F }
  };
};

// --- Conic Standard Params Generator ---
// Converts General Equation Coeffs to Standard parameters
export const generalToStandardConic = (coeffs: { A: number, B: number, C: number, D: number, E: number, F: number }) => {
  const { A, B, C, D, E, F } = coeffs;
  
  // Discriminant B^2 - 4AC
  // < 0 Ellipse
  // > 0 Hyperbola
  // = 0 Parabola
  const delta = B * B - 4 * A * C;
  let type = ConicType.ELLIPSE;
  
  if (Math.abs(delta) < 1e-9) {
      type = ConicType.PARABOLA;
      // Parabola conversion from general form to vertex/focus is complex and specific.
      // For this implementation, we return partial info, preserving type, but likely 
      // relying on the user to tweak params or reset if they break it too much via coeffs.
      return { conicType: type }; 
  } else if (delta > 0) {
      type = ConicType.HYPERBOLA;
  } else {
      type = ConicType.ELLIPSE;
  }

  // 1. Find Center (cx, cy) by solving system of partial derivatives
  // 2Ax + By + D = 0
  // Bx + 2Cy + E = 0
  // Matrix | 2A  B |
  //        | B  2C |
  // Determinant = 4AC - B^2 = -delta
  const det = 4 * A * C - B * B;
  const cx = (B * E - 2 * C * D) / det;
  const cy = (B * D - 2 * A * E) / det;

  // 2. Determine new constant term F' after translation to center
  // F' = F + (D*cx + E*cy)/2
  const F_prime = F + (D * cx + E * cy) / 2;

  // 3. Determine Rotation theta
  // tan(2theta) = B / (A - C)
  let theta = 0;
  if (Math.abs(B) > 1e-9) {
      theta = 0.5 * Math.atan2(B, A - C);
  }

  // 4. Determine new coefficients A', C' along principal axes
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const Ap = A * ct * ct + B * st * ct + C * st * st;
  const Cp = A * st * st - B * st * ct + C * ct * ct;

  // 5. Standard form: Ap*u^2 + Cp*v^2 = -F'
  // u^2 / (-F'/Ap) + v^2 / (-F'/Cp) = 1
  // a^2 = -F'/Ap, b^2 = -F'/Cp
  
  const num1 = -F_prime / Ap;
  const num2 = -F_prime / Cp;
  
  let a = Math.sqrt(Math.abs(num1));
  let b = Math.sqrt(Math.abs(num2));

  return {
      conicType: type,
      cx,
      cy,
      a: isFinite(a) ? a : 1,
      b: isFinite(b) ? b : 1,
      rotation: theta
  };
};

// --- Line & Point Math ---
export const closestPointOnLine = (px: number, py: number, line: {a: number, b: number, c: number}) => {
  const { a, b, c } = line;
  const denom = a * a + b * b;
  if (denom === 0) return { x: px, y: py };
  const x = (b * (b * px - a * py) - a * c) / denom;
  const y = (a * (a * py - b * px) - b * c) / denom;
  return { x, y };
};

export const intersectLines = (l1: {a: number, b: number, c: number}, l2: {a: number, b: number, c: number}) => {
  const det = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(det) < 1e-9) return null; // Parallel
  const x = (l1.b * l2.c - l2.b * l1.c) / det;
  const y = (l1.c * l2.a - l2.c * l1.a) / det;
  return { x, y };
};

export const getLineFromPointAndAngle = (point: GeoPoint, angleRad: number) => {
  // Line vector: (cos(theta), sin(theta))
  // Normal vector: (-sin(theta), cos(theta)) -> (a, b)
  const a = -Math.sin(angleRad);
  const b = Math.cos(angleRad);
  // Line eq: ax + by + c = 0  =>  c = -ax - by
  const c = -a * point.x - b * point.y;
  return { a, b, c };
};

export const getLineFromTwoPoints = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  // a = y1 - y2
  // b = x2 - x1
  // c = -ax1 - by1
  const a = p1.y - p2.y;
  const b = p2.x - p1.x;
  const c = -a * p1.x - b * p1.y;
  return { a, b, c };
};

// Intersect Line (ax + by + c = 0) with Conic (Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0)
export const intersectLineConic = (line: {a: number, b: number, c: number}, conic: GeoConic): {x: number, y: number}[] => {
  const { a, b, c } = line;
  const { A, B, C, D, E, F } = conic.coeffs;

  // Case 1: Line is vertical (b approx 0)
  if (Math.abs(b) < 1e-9) {
    // x = -c/a
    const x = -c / a;
    // Substitute x into conic: C y^2 + (Bx + E) y + (Ax^2 + Dx + F) = 0
    const qa = C;
    const qb = B * x + E;
    const qc = A * x * x + D * x + F;
    
    const disc = qb * qb - 4 * qa * qc;
    if (disc < 0) return [];
    
    const sqrtDisc = Math.sqrt(disc);
    const y1 = (-qb + sqrtDisc) / (2 * qa);
    const y2 = (-qb - sqrtDisc) / (2 * qa);
    
    return [{ x, y: y1 }, { x, y: y2 }];
  }

  // Case 2: Standard line y = kx + m
  const k = -a / b;
  const m = -c / b;

  // Substitute y = kx + m into conic
  // Ax^2 + Bx(kx+m) + C(kx+m)^2 + Dx + E(kx+m) + F = 0
  // Expand:
  // Ax^2 + Bkx^2 + Bmx + C(k^2x^2 + 2kmx + m^2) + Dx + Ekx + Em + F = 0
  // Group x^2: A + Bk + Ck^2
  // Group x: Bm + 2Ckm + D + Ek
  // Group const: Cm^2 + Em + F

  const qa = A + B * k + C * k * k;
  const qb = B * m + 2 * C * k * m + D + E * k;
  const qc = C * m * m + E * m + F;

  const disc = qb * qb - 4 * qa * qc;
  if (disc < 0) return [];

  const sqrtDisc = Math.sqrt(disc);
  const x1 = (-qb + sqrtDisc) / (2 * qa);
  const x2 = (-qb - sqrtDisc) / (2 * qa);
  
  const y1 = k * x1 + m;
  const y2 = k * x2 + m;

  return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
};