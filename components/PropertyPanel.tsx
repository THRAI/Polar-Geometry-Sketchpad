


import React, { useState, useEffect } from 'react';
import { GeoEntity, ObjectType, ConicType } from '../types';
import { X } from 'lucide-react';
import { evaluateMathExpression, generalToStandardConic } from '../utils/math';

interface PropertyPanelProps {
  object: GeoEntity | null;
  onChange: (id: string, changes: Partial<GeoEntity>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

// Helper for inputs that accept math expressions (e.g., "sqrt(3)")
const SmartInput = ({ 
  value, 
  onChange, 
  disabled, 
  label 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  disabled?: boolean;
  label?: string;
}) => {
  const [text, setText] = useState(parseFloat(value.toFixed(4)).toString());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setText(parseFloat(value.toFixed(4)).toString());
    }
  }, [value, isEditing]);

  const commit = () => {
    setIsEditing(false);
    const parsed = evaluateMathExpression(text);
    if (parsed !== null && isFinite(parsed)) {
      onChange(parsed);
      setText(parseFloat(parsed.toFixed(4)).toString());
    } else {
      // Revert on invalid input
      setText(parseFloat(value.toFixed(4)).toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div>
      {label && <label className="text-xs text-gray-500">{label}</label>}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setIsEditing(true)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white disabled:opacity-50 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
};

// Helper to render coeff input
const CoeffInput = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
    <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs w-4 font-bold">{label}</span>
        <SmartInput value={value} onChange={onChange} />
    </div>
);

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ object, onChange, onDelete, onClose }) => {
  if (!object) return null;

  const handleChange = (key: string, value: any) => {
    onChange(object.id, { [key]: value });
  };

  return (
    <div className="absolute right-4 top-4 bottom-4 w-80 bg-gray-800/95 backdrop-blur border-l border-gray-700 shadow-2xl flex flex-col rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
        <h2 className="font-bold text-gray-100 text-lg">{object.name}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* Common Properties */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
          <input
            type="text"
            value={object.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-500 uppercase">Color</label>
          <div className="flex gap-2">
            {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'].map((c) => (
              <button
                key={c}
                onClick={() => handleChange('color', c)}
                className={`w-6 h-6 rounded-full border-2 ${object.color === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Point Properties */}
        {object.type === ObjectType.POINT && (
          <div className="space-y-4">
             <div className="grid grid-cols-2 gap-2">
              <SmartInput 
                label="X" 
                value={object.x} 
                onChange={(v) => handleChange('x', v)} 
                disabled={!object.isFree} 
              />
              <SmartInput 
                label="Y" 
                value={object.y} 
                onChange={(v) => handleChange('y', v)} 
                disabled={!object.isFree} 
              />
            </div>
            {!object.isFree && (
              <div className="p-2 bg-amber-900/20 border border-amber-900/50 rounded">
                <p className="text-xs text-amber-500 italic">This point is constrained.</p>
                {object.onLineId && <p className="text-xs text-amber-400 mt-1">Bound to line.</p>}
                {object.solutionIndex !== undefined && <p className="text-xs text-amber-400 mt-1">Intersection result.</p>}
              </div>
            )}
          </div>
        )}

        {/* Line Properties */}
        {object.type === ObjectType.LINE && (
          <div className="space-y-4">
            
            {/* Pivot Line Slider */}
            {object.pivotPointId && typeof object.angle === 'number' && (
                <div className="space-y-2 pt-2 border-t border-gray-700">
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Pivot Angle</span>
                        <span>{(object.angle * 180 / Math.PI).toFixed(1)}°</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="360" 
                        step="0.1"
                        value={(object.angle * 180 / Math.PI) % 360}
                        onChange={(e) => handleChange('angle', parseFloat(e.target.value) * Math.PI / 180)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            )}

            {object.p1Id && object.p2Id && (
                <p className="text-xs text-blue-400 italic">Defined by 2 points.</p>
            )}

            {object.isFree && !object.p1Id && !object.pivotPointId && (
                 <p className="text-xs text-gray-500">Free Line (abstract).</p>
            )}

            {/* General Equation for Lines */}
            <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-700 space-y-2">
                <label className="text-xs font-semibold text-gray-400 block mb-1">General Equation (Ax+By+C=0)</label>
                <div className="grid grid-cols-3 gap-2">
                    <CoeffInput label="A" value={object.a} onChange={v => {
                        handleChange('a', v);
                        // Clear dependencies to make it a free line defined by equation
                        onChange(object.id, { a: v, isFree: true, p1Id: undefined, p2Id: undefined, pivotPointId: undefined, dependencies: undefined });
                    }} />
                    <CoeffInput label="B" value={object.b} onChange={v => {
                        handleChange('b', v);
                        onChange(object.id, { b: v, isFree: true, p1Id: undefined, p2Id: undefined, pivotPointId: undefined, dependencies: undefined });
                    }} />
                    <CoeffInput label="C" value={object.c} onChange={v => {
                        handleChange('c', v);
                        onChange(object.id, { c: v, isFree: true, p1Id: undefined, p2Id: undefined, pivotPointId: undefined, dependencies: undefined });
                    }} />
                </div>
            </div>
          </div>
        )}

        {/* Conic Properties */}
        {object.type === ObjectType.CONIC && (
          <div className="space-y-4">
             <div>
              <label className="text-xs text-gray-500">Type</label>
              <select
                value={object.conicType}
                onChange={(e) => handleChange('conicType', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white mt-1"
              >
                {Object.values(ConicType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <SmartInput label="Center X" value={object.cx} onChange={(v) => handleChange('cx', v)} />
               <SmartInput label="Center Y" value={object.cy} onChange={(v) => handleChange('cy', v)} />
               
               <SmartInput 
                 label={object.conicType === 'PARABOLA' ? 'Scale (a)' : 'Semi-Major (a)'} 
                 value={object.a} 
                 onChange={(v) => handleChange('a', v)} 
               />
               
               {object.conicType !== 'PARABOLA' && (
                <SmartInput 
                  label="Semi-Minor (b)" 
                  value={object.b} 
                  onChange={(v) => handleChange('b', v)} 
                />
               )}
               
               <SmartInput 
                  label="Rotation (Rad)" 
                  value={object.rotation} 
                  onChange={(v) => handleChange('rotation', v)} 
               />
            </div>
            
            {/* General Equation for Conics */}
            <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-700 space-y-2">
                <label className="text-xs font-semibold text-gray-400 block mb-1">General Equation</label>
                <div className="text-[10px] text-gray-500 font-mono mb-2">Ax² + Bxy + Cy² + Dx + Ey + F = 0</div>
                <div className="grid grid-cols-3 gap-2">
                     {['A','B','C','D','E','F'].map(key => (
                         <CoeffInput 
                            key={key} 
                            label={key} 
                            value={object.coeffs[key as keyof typeof object.coeffs]} 
                            onChange={(val) => {
                                const newCoeffs = { ...object.coeffs, [key]: val };
                                const std = generalToStandardConic(newCoeffs);
                                // Update both coefficients AND standard parameters
                                onChange(object.id, { coeffs: newCoeffs, ...std });
                            }} 
                         />
                     ))}
                </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-900/50">
        <button
          onClick={() => onDelete(object.id)}
          className="w-full py-2 px-4 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded border border-red-900/50 transition-colors text-sm font-medium"
        >
          Delete Object
        </button>
      </div>
    </div>
  );
};