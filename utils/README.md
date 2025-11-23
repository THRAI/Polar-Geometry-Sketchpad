# Utilities Documentation

This directory contains pure functions for mathematical calculations and analytic geometry.

## `math.ts`

This file contains the mathematical engine used to drive the geometry.

### General Helpers
- **`evaluateMathExpression(expr)`**: Safely parses string inputs (e.g. "sin(pi/4)") into numbers.
- **`multiplyMatrixVector(m, v)`**: Performs 3x3 Matrix * 3x1 Vector multiplication, used for projective transformations and polar line calculations.

### Conic Sections
- **`getConicMatrix(conic)`**: Returns the symmetric 3x3 matrix representation of a conic section based on its coefficients.
- **`updateConicCoefficients(conic)`**: Takes a conic defined by geometric parameters (center, semi-axes, rotation) and calculates its General Equation coefficients ($Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$).
- **`generalToStandardConic(coeffs)`**: The inverse of the above. Analyzes the General Equation discriminant to determine conic type, center, rotation, and axes.
- **`calculatePolarLineCoeffs(px, py, conic)`**: Computes the Polar Line of a point with respect to a conic using matrix multiplication ($L = M \cdot P$).

### Linear Algebra & Intersections
- **`closestPointOnLine(px, py, line)`**: Projects a point onto a line (used for constraining points).
- **`intersectLines(l1, l2)`**: Finds the analytic intersection $(x, y)$ of two lines given in general form ($ax+by+c=0$).
- **`intersectLineConic(line, conic)`**: Solves the system of equations formed by a linear equation and a quadratic equation. Returns 0, 1, or 2 intersection points.
- **`getLineFromPointAndAngle`**: Generates line coefficients given a point and an angle.
- **`getLineFromTwoPoints`**: Generates line coefficients given two points.