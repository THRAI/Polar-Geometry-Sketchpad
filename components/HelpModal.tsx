
import React from 'react';
import { X, MousePointer2, Circle, Minus, Diamond, PenTool, Triangle, XCircle, Slash } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900">
          <h2 className="text-2xl font-bold text-white">Geometry Guide</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8">
          
          {/* Section: Basic Tools */}
          <section>
            <h3 className="text-xl font-semibold text-blue-400 mb-4 border-b border-gray-800 pb-2">Basic Tools</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-white">
                  <MousePointer2 size={20} className="text-blue-400" /> <span className="font-bold">Select & Drag</span>
                </div>
                <p className="text-sm text-gray-400">
                  Click objects to view and edit properties in the right panel. Drag points or lines to modify the geometry dynamically.
                </p>
              </div>
              
              <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-white">
                  <Circle size={20} className="text-blue-400" /> <span className="font-bold">Point</span>
                </div>
                <p className="text-sm text-gray-400">Click anywhere on the canvas to create a free point.</p>
              </div>

              <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-white">
                  <Minus size={20} className="text-blue-400" /> <span className="font-bold">Line</span>
                </div>
                <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
                  <li>Click empty space for a free line.</li>
                  <li>Click two existing points to connect them.</li>
                  <li>Click a point then empty space for a pivoted line.</li>
                </ul>
              </div>

              <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-white">
                  <Diamond size={20} className="text-blue-400" /> <span className="font-bold">Conic</span>
                </div>
                <p className="text-sm text-gray-400">Creates a standard Ellipse centered at the click. You can change it to a Hyperbola or Parabola in the properties panel.</p>
              </div>

              <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-white">
                  <XCircle size={20} className="text-blue-400" /> <span className="font-bold">Intersect</span>
                </div>
                <p className="text-sm text-gray-400">
                  Select this tool, then click two objects (Line + Line or Line + Conic) to generate intersection points.
                </p>
              </div>

              <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-white">
                  <Slash size={20} className="text-blue-400" /> <span className="font-bold">Tangent</span>
                </div>
                <p className="text-sm text-gray-400">
                   Select this tool, then click a <span className="text-white font-semibold">Point</span> and a <span className="text-white font-semibold">Conic</span> to create tangent lines from the point to the conic.
                </p>
              </div>
            </div>
          </section>

          {/* Section: Advanced Geometry */}
          <section>
            <h3 className="text-xl font-semibold text-purple-400 mb-4 border-b border-gray-800 pb-2">Projective Concepts</h3>
            
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 text-white">
                    <PenTool size={20} className="text-purple-400" /> 
                    <span className="font-bold text-lg">Pole & Polar</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    In conic geometry, every point (Pole) has a unique corresponding line (Polar), and vice versa.
                    The Polar line represents the perspective harmonic conjugate of the Pole with respect to the conic.
                  </p>
                  <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-lg">
                    <p className="text-xs font-mono text-purple-200 mb-1">USAGE</p>
                    <p className="text-sm text-gray-300">Select the tool, click a <span className="text-white font-semibold">Point</span>, then click a <span className="text-white font-semibold">Conic</span> to generate the Polar Line.</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-800/50 pt-6">
                 <div className="flex items-center gap-2 mb-3 text-white">
                    <Triangle size={20} className="text-green-400" /> 
                    <span className="font-bold text-lg">Self-Polar Triangle</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    A triangle is self-polar with respect to a conic if each vertex is the pole of the opposite side. This configuration is fundamental in projective geometry.
                  </p>
                  <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg">
                    <p className="text-xs font-mono text-green-200 mb-1">USAGE</p>
                    <p className="text-sm text-gray-300">Select the tool, click a <span className="text-white font-semibold">Conic</span>, then click a starting <span className="text-white font-semibold">Point</span>. The app will construct the full triangle.</p>
                  </div>
              </div>
            </div>
          </section>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};