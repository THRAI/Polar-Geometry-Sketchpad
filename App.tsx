
import React, { useState, useEffect, useCallback } from 'react';
import { GeometryCanvas } from './components/GeometryCanvas';
import { Toolbar } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { HelpModal } from './components/HelpModal';
import { GeoEntity, ToolType, ObjectType, GeoPoint, GeoConic, GeoLine, ConicType } from './types';
import { updateConicCoefficients, calculatePolarLineCoeffs, closestPointOnLine, intersectLines, getLineFromPointAndAngle, getLineFromTwoPoints, intersectLineConic } from './utils/math';

const App: React.FC = () => {
  const [objects, setObjects] = useState<GeoEntity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolType>(ToolType.SELECT);
  const [eraserSize, setEraserSize] = useState(20);
  const [showHelp, setShowHelp] = useState(false);

  // --- Reactive Geometry Logic ---
  const solveGeometry = (inputEntities: GeoEntity[]): GeoEntity[] => {
      let currentEntities = inputEntities;
      
      // Run multiple passes to propagate dependencies (e.g. Point -> Line -> Intersection)
      // 3 iterations is sufficient to resolve the dependency depth of typical constructions
      // and prevents visual lag where dependent objects are drawn at previous frame positions.
      for (let i = 0; i < 3; i++) {
          const entityMap = new Map(currentEntities.map(e => [e.id, e]));
          
          currentEntities = currentEntities.map(obj => {
              if (obj.type === ObjectType.CONIC) {
                  return updateConicCoefficients(obj);
              }
              
              if (obj.type === ObjectType.LINE) {
                  // Pivot Line (Rotating around a point)
                  if (obj.pivotPointId && typeof obj.angle === 'number') {
                      const pivot = entityMap.get(obj.pivotPointId);
                      if (pivot && pivot.type === ObjectType.POINT) {
                          const { a, b, c } = getLineFromPointAndAngle(pivot as GeoPoint, obj.angle);
                          return { ...obj, a, b, c };
                      }
                  }

                  // Line defined by Two Points
                  if (obj.p1Id && obj.p2Id) {
                      const p1 = entityMap.get(obj.p1Id) as GeoPoint;
                      const p2 = entityMap.get(obj.p2Id) as GeoPoint;
                      if (p1 && p2) {
                          const { a, b, c } = getLineFromTwoPoints(p1, p2);
                          return { ...obj, a, b, c };
                      }
                  }

                  // Polar Line (Dependent on Point + Conic)
                  if (obj.dependencies && obj.dependencies.length === 2) {
                      const d1 = entityMap.get(obj.dependencies[0]);
                      const d2 = entityMap.get(obj.dependencies[1]);
                      
                      if (d1 && d2) {
                          let point: GeoPoint | null = null;
                          let conic: GeoConic | null = null;
                          
                          if (d1.type === ObjectType.POINT && d2.type === ObjectType.CONIC) {
                              point = d1 as GeoPoint; conic = d2 as GeoConic;
                          } else if (d1.type === ObjectType.CONIC && d2.type === ObjectType.POINT) {
                              conic = d1 as GeoConic; point = d2 as GeoPoint;
                          }
                          
                          if (point && conic) {
                              const updatedConic = updateConicCoefficients(conic); 
                              const { a, b, c } = calculatePolarLineCoeffs(point.x, point.y, updatedConic);
                              return { ...obj, a, b, c };
                          }
                      }
                  }
              }
              
              if (obj.type === ObjectType.POINT) {
                  // Intersection of Line and Conic
                  if (!obj.isFree && obj.dependencies && obj.dependencies.length === 2 && obj.solutionIndex !== undefined) {
                      const d1 = entityMap.get(obj.dependencies[0]);
                      const d2 = entityMap.get(obj.dependencies[1]);
                      
                      let line: GeoLine | null = null;
                      let conic: GeoConic | null = null;

                      if (d1?.type === ObjectType.LINE && d2?.type === ObjectType.CONIC) {
                          line = d1 as GeoLine; conic = d2 as GeoConic;
                      } else if (d1?.type === ObjectType.CONIC && d2?.type === ObjectType.LINE) {
                          conic = d1 as GeoConic; line = d2 as GeoLine;
                      }

                      if (line && conic) {
                          const solutions = intersectLineConic(line, updateConicCoefficients(conic));
                          if (solutions[obj.solutionIndex]) {
                              return { ...obj, x: solutions[obj.solutionIndex].x, y: solutions[obj.solutionIndex].y, hidden: false };
                          } else {
                              // No real intersection or index out of bounds
                              return { ...obj, hidden: true };
                          }
                      }
                  }

                  // Constrained to Line
                  if (obj.onLineId) {
                      const line = entityMap.get(obj.onLineId) as GeoLine;
                      if (line) {
                          const { x, y } = closestPointOnLine(obj.x, obj.y, line);
                          return { ...obj, x, y };
                      }
                  }
                  
                  // Intersection of Two Lines
                  if (!obj.isFree && obj.dependencies && obj.dependencies.length === 2 && obj.solutionIndex === undefined) {
                      const l1 = entityMap.get(obj.dependencies[0]) as GeoLine;
                      const l2 = entityMap.get(obj.dependencies[1]) as GeoLine;
                      if (l1?.type === ObjectType.LINE && l2?.type === ObjectType.LINE) {
                          const intersection = intersectLines(l1, l2);
                          if (intersection) {
                              return { ...obj, x: intersection.x, y: intersection.y, hidden: false };
                          } else {
                              return { ...obj, hidden: true };
                          }
                      }
                  }
              }
              
              return obj;
          });
      }
      
      return currentEntities;
  };

  const handleUpdate = useCallback((id: string, changes: Partial<GeoEntity>) => {
      setObjects(prev => {
          const next = prev.map(o => o.id === id ? { ...o, ...changes } as GeoEntity : o);
          return solveGeometry(next);
      });
  }, []);

  const handleAdd = useCallback((obj: GeoEntity) => {
      setObjects(prev => solveGeometry([...prev, obj]));
  }, []);

  const handleDelete = useCallback((id: string) => {
      setObjects(prev => {
          const next = prev.filter(o => o.id !== id);
          const toDelete = new Set([id]);
          let changed = true;
          while(changed) {
              changed = false;
              next.forEach(o => {
                  if (!toDelete.has(o.id) && (
                      o.dependencies?.some(d => toDelete.has(d)) || 
                      (o.type === ObjectType.POINT && toDelete.has(o.onLineId || '')) || 
                      (o.type === ObjectType.LINE && toDelete.has(o.pivotPointId || '')) ||
                      (o.type === ObjectType.LINE && (toDelete.has(o.p1Id || '') || toDelete.has(o.p2Id || '')))
                  )) {
                      toDelete.add(o.id);
                      changed = true;
                  }
              });
          }
          return next.filter(o => !toDelete.has(o.id));
      });
      // Handle cleanup if the selected object was deleted
      if (selectedId === id) setSelectedId(null);
  }, [selectedId]);
  
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if user is typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        switch(e.key.toLowerCase()) {
            case 's': setTool(ToolType.SELECT); break;
            case 'p': setTool(ToolType.POINT); break;
            case 'l': setTool(ToolType.LINE); break;
            case 'c': setTool(ToolType.CONIC); break;
            case 'i': setTool(ToolType.INTERSECT); break;
            case 'o': setTool(ToolType.POLAR); break; // 'O' for Polar
            case 't': setTool(ToolType.TRIANGLE); break; // 'T' for Triangle
            case 'e': setTool(ToolType.ERASER); break;
            case 'delete':
            case 'backspace':
                if (selectedId) handleDelete(selectedId);
                break;
            case 'escape':
                if (selectedId) setSelectedId(null);
                else setTool(ToolType.SELECT);
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleDelete]);

  // Initialize with a demo scene if empty
  useEffect(() => {
      if (objects.length === 0) {
           const c1: GeoConic = {
            id: 'c1', type: ObjectType.CONIC, conicType: ConicType.ELLIPSE, name: 'Ellipse', color: '#f59e0b',
            cx: 0, cy: 0, a: 3, b: 2, rotation: 0, coeffs: {A:0,B:0,C:0,D:0,E:0,F:0}
           };

           // 1. Two points defining a line
           const pA: GeoPoint = { id: 'pA', type: ObjectType.POINT, name: 'A', color: '#ffffff', x: -4, y: 3, isFree: true };
           const pB: GeoPoint = { id: 'pB', type: ObjectType.POINT, name: 'B', color: '#ffffff', x: -1, y: 4, isFree: true };
           
           const lAB: GeoLine = {
               id: 'lAB', type: ObjectType.LINE, name: 'L(AB)', color: '#8b5cf6',
               a: 0, b: 0, c: 0, isFree: false,
               p1Id: 'pA', p2Id: 'pB'
           };

           // 2. Pivot Point and Rotating Line
           const pPivot: GeoPoint = {
               id: 'pPivot', type: ObjectType.POINT, name: 'Pivot', color: '#10b981', x: 2, y: -2, isFree: true
           };
           const lRot: GeoLine = {
               id: 'lRot', type: ObjectType.LINE, name: 'RotLine', color: '#10b981', 
               a:0, b:0, c:0, isFree: true, 
               pivotPointId: 'pPivot', angle: Math.PI / 3
           };

           // 3. Intersection Points of Rotating Line and Ellipse
           const i1: GeoPoint = {
               id: 'i1', type: ObjectType.POINT, name: 'I1', color: '#ec4899', x:0,y:0, isFree: false,
               dependencies: ['lRot', 'c1'], solutionIndex: 0
           };
           const i2: GeoPoint = {
               id: 'i2', type: ObjectType.POINT, name: 'I2', color: '#ec4899', x:0,y:0, isFree: false,
               dependencies: ['lRot', 'c1'], solutionIndex: 1
           };
           
           setObjects(solveGeometry([c1, pA, pB, lAB, pPivot, lRot, i1, i2]));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedObject = objects.find(o => o.id === selectedId) || null;

  return (
    <div className="flex w-full h-screen bg-gray-900 text-white overflow-hidden font-sans">
      <Toolbar 
        currentTool={tool} 
        setTool={setTool} 
        onOpenHelp={() => setShowHelp(true)} 
        eraserSize={eraserSize}
        setEraserSize={setEraserSize}
      />
      
      <div className="flex-1 relative">
        <GeometryCanvas
          objects={objects}
          selectedId={selectedId}
          tool={tool}
          onSelect={setSelectedId}
          onUpdate={handleUpdate}
          onAdd={handleAdd}
          onDelete={handleDelete}
          eraserSize={eraserSize}
        />
      </div>

      {selectedId && (
        <PropertyPanel
          object={selectedObject}
          onChange={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setSelectedId(null)}
        />
      )}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};

export default App;
