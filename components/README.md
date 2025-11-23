# Components Documentation

This directory contains the React components that make up the user interface.

## File Descriptions

### `App.tsx` (Root Component)
The main controller of the application.
- **State Management**: Holds the single source of truth for `objects` (the scene graph), `tool` (current interaction mode), and `selectedId`.
- **Geometry Solver**: Contains the `solveGeometry` function. This is the core reactive engine that runs on every update. It iterates through the object list to update dependent objects (e.g., if a Point moves, the Line attached to it recalculates its equation, and any Intersections on that line recalculate their coordinates).

### `GeometryCanvas.tsx`
The interactive workspace layer.
- **Rendering**: Uses SVG to render geometric entities.
- **Interaction**: Handles all mouse events (`mousedown`, `mousemove`, `mouseup`, `click`).
- **Coordinate System**: Implements `d3.zoom` to handle the transformation between Screen Pixels and World Coordinates.
- **Eraser Logic**: Implements specific hit-testing to delete objects within a radius.

### `Toolbar.tsx`
The floating sidebar on the left.
- **Function**: Provides buttons to switch the active `ToolType`.
- **Visuals**: Displays active state and tooltips with keyboard shortcuts.

### `PropertyPanel.tsx`
The configuration panel on the right.
- **Function**: Renders inputs for the currently selected object.
- **Bi-directional Editing**: 
  - For Conics: Users can edit Standard Parameters ($center, a, b, rotation$) OR General Coefficients ($A, B, C...$). The component handles the conversion between these two forms via `utils/math.ts`.
- **Smart Inputs**: Text inputs allow math expressions (e.g. typing `sqrt(3)` results in `1.732...`).

### `HelpModal.tsx`
A static overlay component that provides a guide/tutorial for the application's tools.