# Conic Geometry Sketchpad

A specialized dynamic geometry application built with React and TypeScript, designed for exploring conic sections, projective geometry, and analytic geometry concepts.

## Features

- **Dynamic Geometry Engine**: Create points, lines, and conics that update in real-time.
- **Conic Sections**: Support for Ellipses, Hyperbolas, and Parabolas with full parameter control (center, axes, rotation) and General Equation ($Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$) editing.
- **Projective Tools**:
  - **Tangent Lines**: Automatically calculate tangents from a point to a conic.
  - **Pole & Polar**: Visualize the duality between points and lines with respect to a conic.
  - **Self-Polar Triangle**: Construct triangles where each vertex is the pole of the opposite side.
- **Math Evaluation**: Input fields support mathematical expressions (e.g., `sqrt(2)`, `pi/2`).
- **Intersection**: Calculate intersections between Lines and Conics or two Lines.

## Tech Stack

- **React**: UI Components and state management.
- **TypeScript**: Type safety for geometric entities.
- **D3.js**: Used for the interactive canvas (Zoom, Pan, Coordinate transformations).
- **Tailwind CSS**: Styling.

## Usage

1. **Select Tool**: Click objects to view properties or drag them to move.
2. **Point/Line/Conic**: Click on the canvas to create basic shapes.
3. **Tangent Tool**: Select tool -> Click Point -> Click Conic.
4. **Polar Tool**: Select tool -> Click Point (Pole) -> Click Conic (generates Polar Line).
5. **Intersect Tool**: Select tool -> Click two intersecting objects.

## Mathematical Core

The application uses analytic geometry (General Equation of Conics) and homogenous coordinates (Matrices) to solve projective relationships accurately.