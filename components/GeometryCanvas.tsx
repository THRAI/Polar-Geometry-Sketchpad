
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { GeoEntity, ObjectType, GeoPoint, GeoLine, GeoConic, ToolType, ConicType } from '../types';
import { Crosshair } from 'lucide-react';

interface GeometryCanvasProps {
  objects: GeoEntity[];
  selectedId: string | null;
  tool: ToolType;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, changes: Partial<GeoEntity>) => void;
  onAdd: (obj: GeoEntity) => void;
  onDelete: (id: string) => void;
  eraserSize: number;
}

export const GeometryCanvas: React.FC<GeometryCanvasProps> = ({
  objects,
  selectedId,
  tool,
  onSelect,
  onUpdate,
  onAdd,
  onDelete,
  eraserSize,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // Initial scale 50: 50px = 1 unit
  const [transform, setTransform] = useState(d3.zoomIdentity.translate(window.innerWidth / 2, window.innerHeight / 2).scale(50)); 
  
  // Coordinate System UI State
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  // Raw mouse client position for DOM element detection (Eraser)
  const [clientPos, setClientPos] = useState({ x: 0, y: 0 });
  const [focusInput, setFocusInput] = useState({ x: '0', y: '0' });

  // D3 Zoom behavior
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([5, 500]) // Allow deeper zoom
      .on('zoom', (event) => {
        setTransform(event.transform);
      })
      .filter((event) => {
        // Prevent zoom on right click, if internal logic stopped propagation, OR if using Eraser
        if (event.defaultPrevented) return false;
        // Disable zoom panning when Eraser is active
        if (tool === ToolType.ERASER) return false;
        return true;
      });
    
    zoomRef.current = zoom;

    svg.call(zoom).on("dblclick.zoom", null);
  }, [tool]); // Re-bind if tool changes to update filter

  // Coordinate conversion
  const toScreen = (x: number, y: number) => ({
    x: transform.applyX(x),
    y: transform.applyY(y), 
  });
  
  // Inverse
  const toWorld = (sx: number, sy: number) => {
    const k = transform.k;
    return {
      x: (sx - transform.x) / k,
      y: (sy - transform.y) / k
    };
  };

  // Focus Handler
  const handleFocusSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!zoomRef.current || !svgRef.current) return;
      
      const x = parseFloat(focusInput.x);
      const y = parseFloat(focusInput.y);
      
      if (isNaN(x) || isNaN(y)) return;
      
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;
      const k = transform.k;
      
      // Center (x,y) on screen
      const tx = width / 2 - x * k;
      const ty = height / 2 - y * k;
      
      const newTransform = d3.zoomIdentity.translate(tx, ty).scale(k);
      
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, newTransform);
  };

  // Handlers
  const handleSvgClick = (e: React.MouseEvent) => {
    if (e.defaultPrevented) return; 
    
    const { x, y } = toWorld(e.clientX, e.clientY);

    // Eraser has separate drag logic, but single click handled in mouse move/down combination
    if (tool === ToolType.ERASER) return;

    if (tool === ToolType.SELECT) {
      onSelect(null);
    } else if (tool === ToolType.POINT) {
      const newPoint: GeoPoint = {
        id: crypto.randomUUID(),
        type: ObjectType.POINT,
        name: `P${objects.filter(o => o.type === ObjectType.POINT).length + 1}`,
        color: '#ffffff',
        x,
        y,
        isFree: true
      };
      onAdd(newPoint);
    } else if (tool === ToolType.CONIC) {
        const newConic: GeoConic = {
            id: crypto.randomUUID(),
            type: ObjectType.CONIC,
            conicType: ConicType.ELLIPSE,
            name: `C${objects.filter(o => o.type === ObjectType.CONIC).length + 1}`,
            color: '#f59e0b',
            cx: x,
            cy: y,
            a: 2,
            b: 1,
            rotation: 0,
            coeffs: { A:0, B:0, C:0, D:0, E:0, F:0} 
        };
        onAdd(newConic);
    } else if (tool === ToolType.LINE) {
        if (selectedId) {
           const prev = objects.find(o => o.id === selectedId);
           if (prev && prev.type === ObjectType.POINT) {
                const newLine: GeoLine = {
                    id: crypto.randomUUID(),
                    type: ObjectType.LINE,
                    name: `L(${prev.name})`,
                    color: '#3b82f6',
                    isFree: true,
                    a: 0, b: 0, c: 0,
                    pivotPointId: prev.id,
                    angle: 0 
                };
                onAdd(newLine);
                onSelect(null);
                return;
           }
        }

        const newLine: GeoLine = {
            id: crypto.randomUUID(),
            type: ObjectType.LINE,
            name: `L${objects.filter(o => o.type === ObjectType.LINE).length + 1}`,
            color: '#3b82f6',
            isFree: true,
            a: 1, b: -1, c: y - x
        };
        onAdd(newLine);
        onSelect(null);
    }
  };

  const handleObjectClick = (e: React.MouseEvent, obj: GeoEntity) => {
    if (tool === ToolType.ERASER) {
        // Click handled by eraser logic (mousedown/move) usually, but if click fires before drag logic, handle it here
        e.preventDefault();
        e.stopPropagation();
        onDelete(obj.id);
        return;
    }

    e.stopPropagation();
    e.preventDefault(); 
    
    if (tool === ToolType.POINT && obj.type === ObjectType.LINE) {
        const { x, y } = toWorld(e.clientX, e.clientY);
        const newPoint: GeoPoint = {
            id: crypto.randomUUID(),
            type: ObjectType.POINT,
            name: `P${objects.filter(o => o.type === ObjectType.POINT).length + 1}`,
            color: '#ffffff',
            x,
            y,
            isFree: false,
            onLineId: obj.id
        };
        onAdd(newPoint);
        onSelect(newPoint.id);
        return;
    }

    onSelect(obj.id);

    if (tool === ToolType.LINE && selectedId && obj.type === ObjectType.POINT) {
        const prev = objects.find(o => o.id === selectedId);
        if (prev && prev.type === ObjectType.POINT && prev.id !== obj.id) {
             onAdd({
                 id: crypto.randomUUID(),
                 type: ObjectType.LINE,
                 name: `L(${prev.name},${obj.name})`,
                 color: '#3b82f6',
                 a:0, b:0, c:0,
                 isFree: false,
                 p1Id: prev.id,
                 p2Id: obj.id
             } as GeoLine);
             onSelect(null);
        }
    }
    else if (tool === ToolType.INTERSECT && selectedId) {
        const prev = objects.find(o => o.id === selectedId);
        if (prev) {
            let l: GeoLine | null = null;
            let c: GeoConic | null = null;

            if (prev.type === ObjectType.LINE && obj.type === ObjectType.CONIC) {
                l = prev as GeoLine; c = obj as GeoConic;
            } else if (prev.type === ObjectType.CONIC && obj.type === ObjectType.LINE) {
                c = prev as GeoConic; l = obj as GeoLine;
            }

            if (l && c) {
                const i1: GeoPoint = {
                    id: crypto.randomUUID(),
                    type: ObjectType.POINT,
                    name: `I1(${l.name},${c.name})`,
                    color: '#ffffff',
                    x: 0, y: 0,
                    isFree: false,
                    dependencies: [l.id, c.id],
                    solutionIndex: 0
                };
                 const i2: GeoPoint = {
                    id: crypto.randomUUID(),
                    type: ObjectType.POINT,
                    name: `I2(${l.name},${c.name})`,
                    color: '#ffffff',
                    x: 0, y: 0,
                    isFree: false,
                    dependencies: [l.id, c.id],
                    solutionIndex: 1
                };
                onAdd(i1);
                onAdd(i2);
                onSelect(null);
            } 
            else if (prev.type === ObjectType.LINE && obj.type === ObjectType.LINE) {
                const l1 = prev as GeoLine;
                const l2 = obj as GeoLine;
                const i: GeoPoint = {
                    id: crypto.randomUUID(),
                    type: ObjectType.POINT,
                    name: `I(${l1.name},${l2.name})`,
                    color: '#ffffff',
                    x: 0, y: 0,
                    isFree: false,
                    dependencies: [l1.id, l2.id]
                };
                onAdd(i);
                onSelect(null);
            }
        }
    }
    else if (tool === ToolType.TANGENT && selectedId) {
        const prev = objects.find(o => o.id === selectedId);
        if (prev) {
             let p: GeoPoint | null = null;
             let c: GeoConic | null = null;
             if (prev.type === ObjectType.POINT && obj.type === ObjectType.CONIC) {
                 p = prev as GeoPoint; c = obj as GeoConic;
             } else if (prev.type === ObjectType.CONIC && obj.type === ObjectType.POINT) {
                 c = prev as GeoConic; p = obj as GeoPoint;
             }

             if (p && c) {
                 // 1. Create hidden polar line
                 const polarId = crypto.randomUUID();
                 const polar: GeoLine = {
                     id: polarId,
                     type: ObjectType.LINE,
                     name: `Polar(${p.name})`,
                     color: '#666',
                     isFree: false, a:0, b:0, c:0,
                     dependencies: [p.id, c.id],
                     hidden: true
                 };

                 // 2. Create intersection points (tangency points)
                 const t1Id = crypto.randomUUID();
                 const t1: GeoPoint = {
                     id: t1Id, type: ObjectType.POINT, name: `T1`, color: '#d1d5db',
                     x:0, y:0, isFree: false, dependencies: [polarId, c.id], solutionIndex: 0
                 };
                 const t2Id = crypto.randomUUID();
                 const t2: GeoPoint = {
                     id: t2Id, type: ObjectType.POINT, name: `T2`, color: '#d1d5db',
                     x:0, y:0, isFree: false, dependencies: [polarId, c.id], solutionIndex: 1
                 };

                 // 3. Create tangent lines
                 const l1: GeoLine = {
                     id: crypto.randomUUID(), type: ObjectType.LINE, name: `Tan1(${p.name})`, color: '#a78bfa',
                     isFree: false, a:0, b:0, c:0, p1Id: p.id, p2Id: t1Id
                 };
                 const l2: GeoLine = {
                     id: crypto.randomUUID(), type: ObjectType.LINE, name: `Tan2(${p.name})`, color: '#a78bfa',
                     isFree: false, a:0, b:0, c:0, p1Id: p.id, p2Id: t2Id
                 };

                 onAdd(polar);
                 onAdd(t1);
                 onAdd(t2);
                 onAdd(l1);
                 onAdd(l2);
                 onSelect(null);
             }
        }
    }
    else if (tool === ToolType.POLAR && selectedId && obj.type === ObjectType.CONIC) {
        const prev = objects.find(o => o.id === selectedId);
        if (prev && prev.type === ObjectType.POINT) {
            onAdd({
                id: crypto.randomUUID(),
                type: ObjectType.LINE,
                name: `Polar(${prev.name})`,
                color: '#ef4444',
                a: 0, b: 0, c: 0,
                isFree: false,
                dependencies: [prev.id, obj.id]
            } as GeoLine);
            onSelect(null);
        }
    } else if (tool === ToolType.POLAR && selectedId && obj.type === ObjectType.POINT) {
        const prev = objects.find(o => o.id === selectedId);
        if (prev && prev.type === ObjectType.CONIC) {
             onAdd({
                id: crypto.randomUUID(),
                type: ObjectType.LINE,
                name: `Polar(${obj.name})`,
                color: '#ef4444',
                a: 0, b: 0, c: 0,
                isFree: false,
                dependencies: [obj.id, prev.id]
            } as GeoLine);
            onSelect(null);
        }
    } else if (tool === ToolType.TRIANGLE && selectedId && obj.type === ObjectType.POINT) {
        const prev = objects.find(o => o.id === selectedId);
        if (prev && prev.type === ObjectType.CONIC) {
            const conicId = prev.id;
            const p1Id = obj.id;
            const l1Id = crypto.randomUUID();
            const l1: GeoLine = { id: l1Id, type: ObjectType.LINE, name: `p(${obj.name})`, color: '#666', isFree: false, a:0,b:0,c:0, dependencies: [p1Id, conicId]};
            const p2Id = crypto.randomUUID();
            const p2: GeoPoint = { id: p2Id, type: ObjectType.POINT, name: `${obj.name}'`, color: '#fff', x:0, y:0, isFree: true, onLineId: l1Id }; 
            const l2Id = crypto.randomUUID();
            const l2: GeoLine = { id: l2Id, type: ObjectType.LINE, name: `p(${p2.name})`, color: '#666', isFree: false, a:0,b:0,c:0, dependencies: [p2Id, conicId]};
            const p3Id = crypto.randomUUID();
            const p3: GeoPoint = { id: p3Id, type: ObjectType.POINT, name: `${obj.name}''`, color: '#fff', x:0,y:0, isFree: false, dependencies: [l1Id, l2Id] };
            const l3Id = crypto.randomUUID();
            const l3: GeoLine = { id: l3Id, type: ObjectType.LINE, name: `p(${p3.name})`, color: '#666', isFree: false, a:0,b:0,c:0, dependencies: [p3Id, conicId]};

            onAdd(l1);
            onAdd(p2);
            onAdd(l2);
            onAdd(p3);
            onAdd(l3);
            onSelect(null);
        }
    }
  };

  // Dragging Logic
  const dragStartRef = useRef<{ 
      id: string, 
      startX: number, 
      startY: number, 
      objStartX?: number, 
      objStartY?: number,
      objStartC?: number,
      objStartAngle?: number
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, obj?: GeoEntity) => {
     if (tool === ToolType.ERASER) {
         // Trigger initial erase on click
         eraseAt(e.clientX, e.clientY);
         return;
     }

     if (tool !== ToolType.SELECT || !obj) return;

     const canDragPoint = obj.type === ObjectType.POINT && (obj.isFree || !!obj.onLineId);
     const canDragLine = obj.type === ObjectType.LINE && (obj.isFree || !!obj.pivotPointId);

     if (canDragPoint || canDragLine) {
         e.preventDefault();
         e.stopPropagation();
         e.nativeEvent.stopImmediatePropagation();

         const { x, y } = toWorld(e.clientX, e.clientY);
         
         dragStartRef.current = {
             id: obj.id,
             startX: x,
             startY: y,
         };

         if (obj.type === ObjectType.POINT) {
             dragStartRef.current.objStartX = obj.x;
             dragStartRef.current.objStartY = obj.y;
         } else if (obj.type === ObjectType.LINE) {
             dragStartRef.current.objStartC = obj.c;
             dragStartRef.current.objStartAngle = obj.angle;
         }
     }
  };

  const eraseAt = (clientX: number, clientY: number) => {
      const { x: wx, y: wy } = toWorld(clientX, clientY);
      // Convert pixel size to world units for distance checking
      const worldRadius = eraserSize / transform.k;

      // Set of IDs to remove
      const idsToRemove = new Set<string>();

      // 1. Analytic Distance Check for Points and Lines
      objects.forEach(obj => {
          if (obj.hidden) return;
          
          if (obj.type === ObjectType.POINT) {
              const dist = Math.hypot(obj.x - wx, obj.y - wy);
              if (dist <= worldRadius) {
                  idsToRemove.add(obj.id);
              }
          } else if (obj.type === ObjectType.LINE) {
              // Distance from point to line: |ax + by + c| / sqrt(a^2 + b^2)
              const dist = Math.abs(obj.a * wx + obj.b * wy + obj.c) / Math.sqrt(obj.a*obj.a + obj.b*obj.b);
              // Allow slightly more leniency for lines or use exact radius
              if (dist <= worldRadius) {
                  idsToRemove.add(obj.id);
              }
          }
      });

      // 2. DOM Element Check for Conics (and fallback for others)
      // Since Conics are hard to hit-test analytically without heavy math.
      // elementFromPoint only returns the TOP element. 
      // For a "broad" eraser, we might miss things if we only check the exact pixel.
      // However, combined with the math check above, this mainly covers Conic curves.
      const el = document.elementFromPoint(clientX, clientY);
      if (el) {
          // Check if we hit an SVG path/ellipse that has a data-id
          const dataId = el.getAttribute('data-id');
          if (dataId) {
             const obj = objects.find(o => o.id === dataId);
             // Only add if it's a conic, since points/lines are handled better by math (radius area)
             // But no harm in adding others if direct hit
             if (obj && obj.type === ObjectType.CONIC) {
                 idsToRemove.add(dataId);
             }
          }
      }

      idsToRemove.forEach(id => onDelete(id));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const world = toWorld(e.clientX, e.clientY);
    setCursorPos(world);
    setClientPos({ x: e.clientX, y: e.clientY });

    // Eraser Drag Logic
    if (tool === ToolType.ERASER) {
        // If mouse is down (buttons === 1)
        if (e.buttons === 1) {
            eraseAt(e.clientX, e.clientY);
        }
        return;
    }

    if (dragStartRef.current) {
        const { x, y } = world;
        const objId = dragStartRef.current.id;
        const draggedObj = objects.find(o => o.id === objId);
        if (!draggedObj) return;

        if (draggedObj.type === ObjectType.POINT) {
            const dx = x - dragStartRef.current.startX;
            const dy = y - dragStartRef.current.startY;
            
            onUpdate(objId, {
                x: (dragStartRef.current.objStartX || 0) + dx,
                y: (dragStartRef.current.objStartY || 0) + dy
            });
        } else if (draggedObj.type === ObjectType.LINE) {
            if (draggedObj.pivotPointId && draggedObj.angle !== undefined) {
                 const pivot = objects.find(o => o.id === draggedObj.pivotPointId);
                 if (pivot && pivot.type === ObjectType.POINT) {
                     const angle = Math.atan2(y - pivot.y, x - pivot.x);
                     onUpdate(objId, { angle });
                 }
            } else if (draggedObj.isFree && !draggedObj.p1Id) {
                 const dx = x - dragStartRef.current.startX;
                 const dy = y - dragStartRef.current.startY;
                 const a = draggedObj.a;
                 const b = draggedObj.b;
                 const startC = dragStartRef.current.objStartC || 0;
                 
                 onUpdate(objId, {
                     c: startC - a * dx - b * dy
                 });
            }
        }
    }
  };

  const handleMouseUp = () => {
    dragStartRef.current = null;
  };

  // --- Render Helpers ---

  const renderGrid = () => {
      const { x, y, k } = transform;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const startX = (0 - x) / k;
      const endX = (width - x) / k;
      const startY = (0 - y) / k;
      const endY = (height - y) / k;
      
      const drawStep = k >= 20 ? 1 : 5;

      const ticks = [];
      const startI = Math.floor(startX / drawStep) * drawStep;
      const endI = Math.ceil(endX / drawStep) * drawStep;
      const startJ = Math.floor(startY / drawStep) * drawStep;
      const endJ = Math.ceil(endY / drawStep) * drawStep;

      for (let i = startI; i <= endI; i += drawStep) {
          const val = parseFloat(i.toFixed(2));
          const isAxis = Math.abs(val) < 0.001;
          const isMajor = val % 5 === 0;
          const stroke = isAxis ? "#9ca3af" : (isMajor ? "#4b5563" : "#374151");
          const width = isAxis ? 2/k : 1/k;
          
          ticks.push(
            <line key={`v${val}`} x1={val} y1={startY} x2={val} y2={endY} stroke={stroke} strokeWidth={width} vectorEffect="non-scaling-stroke" />
          );
      }

      for (let j = startJ; j <= endJ; j += drawStep) {
          const val = parseFloat(j.toFixed(2));
          const isAxis = Math.abs(val) < 0.001;
          const isMajor = val % 5 === 0;
          const stroke = isAxis ? "#9ca3af" : (isMajor ? "#4b5563" : "#374151");
          const width = isAxis ? 2/k : 1/k;

          ticks.push(
            <line key={`h${val}`} x1={startX} y1={val} x2={endX} y2={val} stroke={stroke} strokeWidth={width} vectorEffect="non-scaling-stroke" />
          );
      }
      
      return <g>{ticks}</g>;
  };

  const renderObject = (obj: GeoEntity) => {
    if (obj.hidden) return null; // Ensure hidden objects are not rendered

    if (obj.type === ObjectType.CONIC) {
        const { cx, cy, a, b, rotation, conicType, color } = obj;
        const isSelected = selectedId === obj.id;
        const strokeWidth = isSelected ? 3/transform.k : 2/transform.k;
        
        if (conicType === ConicType.ELLIPSE) {
             return (
                <ellipse
                    key={obj.id}
                    data-id={obj.id}
                    cx={cx} cy={cy} rx={a} ry={b}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    transform={`rotate(${rotation * 180 / Math.PI}, ${cx}, ${cy})`}
                    onClick={(e) => handleObjectClick(e, obj)}
                    className="cursor-pointer hover:opacity-80"
                />
            );
        } else if (conicType === ConicType.PARABOLA) {
            const pathData = d3.path();
            const range = 10; 
            for(let t = -range; t <= range; t+=0.1) {
                 const localX = (t*t)/(4*a);
                 const localY = t;
                 if (t === -range) pathData.moveTo(localX, localY);
                 else pathData.lineTo(localX, localY);
            }
            return (
                <path
                    key={obj.id}
                    data-id={obj.id}
                    d={pathData.toString()}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    transform={`translate(${cx},${cy}) rotate(${rotation * 180 / Math.PI})`}
                    onClick={(e) => handleObjectClick(e, obj)}
                    className="cursor-pointer hover:opacity-80"
                />
            )
        } else if (conicType === ConicType.HYPERBOLA) {
             const drawBranch = (sign: number) => {
                  const pathData = d3.path();
                  const range = 2.5;
                  for (let t = -range; t <= range; t+=0.1) {
                      const localX = sign * a * Math.cosh(t);
                      const localY = b * Math.sinh(t);
                       if (t === -range) pathData.moveTo(localX, localY);
                        else pathData.lineTo(localX, localY);
                  }
                  return pathData.toString();
             };
             
             return (
                 <g key={obj.id} 
                    data-id={obj.id}
                    transform={`translate(${cx},${cy}) rotate(${rotation * 180 / Math.PI})`}
                    onClick={(e) => handleObjectClick(e, obj)}
                    className="cursor-pointer hover:opacity-80"
                 >
                     <path data-id={obj.id} d={drawBranch(1)} fill="none" stroke={color} strokeWidth={strokeWidth} />
                     <path data-id={obj.id} d={drawBranch(-1)} fill="none" stroke={color} strokeWidth={strokeWidth} />
                 </g>
             )
        }
    } else if (obj.type === ObjectType.POINT) {
        const isSelected = selectedId === obj.id;
        const canDrag = obj.isFree || !!obj.onLineId;
        return (
            <g key={obj.id} data-id={obj.id} transform={`translate(${obj.x}, ${obj.y})`}>
                <circle
                    data-id={obj.id}
                    r={isSelected ? 8/transform.k : 5/transform.k}
                    fill={obj.color}
                    stroke="black"
                    strokeWidth={1/transform.k}
                    className="transition-all"
                    style={{ cursor: canDrag && tool === ToolType.SELECT ? 'move' : 'pointer' }}
                    onMouseDown={(e) => handleMouseDown(e, obj)}
                    onClick={(e) => handleObjectClick(e, obj)}
                />
                <text y={-10/transform.k} fontSize={12/transform.k} fill={obj.color} textAnchor="middle" className="pointer-events-none select-none font-bold bg-black/50 px-1 rounded">{obj.name}</text>
            </g>
        );
    } else if (obj.type === ObjectType.LINE) {
        const { a, b, c, color } = obj;
        const bounds = {
             left: (0 - transform.x) / transform.k,
             right: (window.innerWidth - transform.x) / transform.k,
             top: (0 - transform.y) / transform.k,
             bottom: (window.innerHeight - transform.y) / transform.k,
        };
        
        let x1, y1, x2, y2;
        // Standard line intersection with viewbox logic
        if (Math.abs(b) > Math.abs(a)) {
             x1 = bounds.left - 100; 
             y1 = (-c - a * x1) / b;
             x2 = bounds.right + 100;
             y2 = (-c - a * x2) / b;
        } else {
             y1 = bounds.top - 100;
             x1 = (-c - b * y1) / a;
             y2 = bounds.bottom + 100;
             x2 = (-c - b * y2) / a;
        }

        const isSelected = selectedId === obj.id;
        const canDrag = obj.isFree || !!obj.pivotPointId;

        return (
            <g key={obj.id} data-id={obj.id} className="group">
                {/* Invisible thicker stroke for hit detection */}
                <line
                    data-id={obj.id}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="transparent"
                    strokeWidth={20/transform.k}
                    className="active:cursor-grabbing"
                    style={{ cursor: canDrag && tool === ToolType.SELECT ? 'move' : 'pointer' }}
                    onMouseDown={(e) => handleMouseDown(e, obj)}
                    onClick={(e) => handleObjectClick(e, obj)}
                />
                <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={color}
                    strokeWidth={isSelected ? 3/transform.k : 1.5/transform.k}
                    className="pointer-events-none"
                />
            </g>
        )
    }
    return null;
  };

  return (
    <div 
        className={`w-full h-full bg-gray-950 overflow-hidden relative ${tool === ToolType.ERASER ? 'cursor-none' : ''}`} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onMouseDown={(e) => handleMouseDown(e)}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        onClick={handleSvgClick}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
           {renderGrid()}
           {objects.filter(o => o.type === ObjectType.CONIC).map(renderObject)}
           {objects.filter(o => o.type === ObjectType.LINE).map(renderObject)}
           {objects.filter(o => o.type === ObjectType.POINT).map(renderObject)}
        </g>
      </svg>
      
      {/* Eraser Visual Cursor */}
      {tool === ToolType.ERASER && (
          <div 
            className="pointer-events-none fixed rounded-full border-2 border-white bg-red-500/30 z-50 mix-blend-screen"
            style={{
                left: clientPos.x,
                top: clientPos.y,
                width: eraserSize * 2,
                height: eraserSize * 2,
                transform: 'translate(-50%, -50%)'
            }}
          />
      )}

      {/* Coordinate & Focus Panel */}
      <div className="absolute left-24 top-4 p-3 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-xl shadow-lg flex flex-col gap-2 z-10">
          <div className="flex items-center gap-2 font-mono text-xs text-gray-300">
             <span className="text-gray-500 w-8">Pos:</span>
             <span>{cursorPos.x.toFixed(2)}, {cursorPos.y.toFixed(2)}</span>
          </div>
          <form onSubmit={handleFocusSubmit} className="flex items-center gap-2">
             <div className="flex items-center gap-1">
               <label className="text-xs text-gray-500 font-mono">X</label>
               <input 
                 className="w-14 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                 value={focusInput.x}
                 onChange={e => setFocusInput(p => ({...p, x: e.target.value}))}
               />
             </div>
             <div className="flex items-center gap-1">
               <label className="text-xs text-gray-500 font-mono">Y</label>
               <input 
                 className="w-14 bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                 value={focusInput.y}
                 onChange={e => setFocusInput(p => ({...p, y: e.target.value}))}
               />
             </div>
             <button type="submit" className="p-1 hover:bg-blue-600 bg-gray-700 rounded text-white transition-colors" title="Focus View">
                <Crosshair size={14} />
             </button>
          </form>
      </div>

      {/* Coordinates indicator */}
      <div className="absolute bottom-4 left-4 text-gray-500 font-mono text-xs pointer-events-none">
         Scale: 1 unit = {transform.k.toFixed(1)}px
      </div>
    </div>
  );
};
