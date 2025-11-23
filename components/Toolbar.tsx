
import React from 'react';
import { MousePointer2, Circle, Minus, Diamond, PenTool, Triangle, XCircle, HelpCircle, Eraser } from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (t: ToolType) => void;
  onOpenHelp: () => void;
  eraserSize: number;
  setEraserSize: (s: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ currentTool, setTool, onOpenHelp, eraserSize, setEraserSize }) => {
  const tools = [
    { id: ToolType.SELECT, icon: MousePointer2, label: 'Select', shortcut: 'S' },
    { id: ToolType.POINT, icon: Circle, label: 'Point', shortcut: 'P' },
    { id: ToolType.LINE, icon: Minus, label: 'Line', shortcut: 'L' },
    { id: ToolType.CONIC, icon: Diamond, label: 'Conic', shortcut: 'C' },
    { id: ToolType.INTERSECT, icon: XCircle, label: 'Intersect', shortcut: 'I' },
    { id: ToolType.POLAR, icon: PenTool, label: 'Polar Line', shortcut: 'O' },
    { id: ToolType.TRIANGLE, icon: Triangle, label: 'Self-Polar Triangle', shortcut: 'T' },
    { id: ToolType.ERASER, icon: Eraser, label: 'Eraser', shortcut: 'E' },
  ];

  const renderLabel = (label: string, shortcut: string) => {
    const idx = label.toLowerCase().indexOf(shortcut.toLowerCase());
    if (idx === -1) return <span>{label}</span>;
    
    return (
      <span>
        {label.slice(0, idx)}
        <span className="font-bold text-blue-300">{label[idx]}</span>
        {label.slice(idx + 1)}
      </span>
    );
  };

  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-4">
      {/* Tools */}
      <div className="flex flex-col gap-2 bg-gray-800/90 backdrop-blur p-2 rounded-xl border border-gray-700 shadow-xl">
        {tools.map((item) => (
          <button
            key={item.id}
            onClick={() => setTool(item.id)}
            className={`p-3 rounded-lg transition-all relative group ${
              currentTool === item.id
                ? 'bg-blue-600 text-white shadow-blue-500/30 shadow-lg'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            title={`${item.label} (${item.shortcut})`}
          >
            <item.icon size={24} strokeWidth={2} />
            <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-gray-700 flex gap-1">
              {renderLabel(item.label, item.shortcut)}
            </span>
          </button>
        ))}
      </div>

      {/* Eraser Settings */}
      {currentTool === ToolType.ERASER && (
        <div className="bg-gray-800/90 backdrop-blur p-3 rounded-xl border border-gray-700 shadow-xl flex flex-col gap-2 animate-in fade-in slide-in-from-left-4">
            <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span>Eraser Size</span>
                <span>{eraserSize}px</span>
            </div>
            <input 
                type="range" 
                min="5" 
                max="100" 
                value={eraserSize} 
                onChange={(e) => setEraserSize(Number(e.target.value))}
                className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
        </div>
      )}

      {/* Help Button */}
      <button
        onClick={onOpenHelp}
        className="bg-gray-800/90 backdrop-blur p-3 rounded-xl border border-gray-700 shadow-xl text-yellow-500 hover:text-yellow-400 hover:bg-gray-700 transition-all group relative"
      >
        <HelpCircle size={24} strokeWidth={2} />
        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-gray-700">
          Help & Guide
        </span>
      </button>
    </div>
  );
};
