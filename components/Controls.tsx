import React from 'react';
import { SimulationConfig, SimulationAction } from '../types';

interface ControlsProps {
  config: SimulationConfig;
  onConfigChange: (key: keyof SimulationConfig, value: number) => void;
  onAction: (action: SimulationAction) => void;
}

const Controls: React.FC<ControlsProps> = ({ config, onConfigChange, onAction }) => {
  return (
    <div className="absolute top-6 left-6 w-80 z-20 bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-5 max-h-[90vh] overflow-y-auto custom-scroll text-slate-200">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
        <h1 className="text-lg font-bold text-white tracking-wide">PHYSICS LAB</h1>
      </div>
      <p className="text-xs text-slate-400 mb-6 border-b border-slate-700 pb-2">
        Uniformly Accelerated Motion
      </p>

      <div className="space-y-5">
        {/* Height */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">HEIGHT (y₀)</span>
            <span className="text-white font-mono bg-slate-700 px-2 py-0.5 rounded">
              {config.height} m
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={config.height}
            onChange={(e) => onConfigChange('height', Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Gravity */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">GRAVITY (g)</span>
            <span className="text-yellow-400 font-mono bg-slate-700 px-2 py-0.5 rounded">
              {config.gravity} m/s²
            </span>
          </div>
          <input
            type="range"
            min="1.6"
            max="20"
            step="0.1"
            value={config.gravity}
            onChange={(e) => onConfigChange('gravity', Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Mass */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">MASS (m)</span>
            <span className="text-blue-300 font-mono bg-slate-700 px-2 py-0.5 rounded">
              {config.mass} kg
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={config.mass}
            onChange={(e) => onConfigChange('mass', Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          onClick={() => onAction(SimulationAction.START)}
          className="col-span-2 bg-cyan-700 hover:bg-cyan-600 text-white py-2.5 rounded shadow-lg font-bold text-sm tracking-wider transition active:scale-95 uppercase"
        >
          Start Drop
        </button>
        <button
          onClick={() => onAction(SimulationAction.PAUSE)}
          className="col-span-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-semibold border border-slate-600 transition active:scale-95 uppercase"
        >
          Pause
        </button>
        <button
          onClick={() => onAction(SimulationAction.STEP)}
          className="col-span-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded text-xs font-semibold border border-slate-600 transition active:scale-95 uppercase"
        >
          Step +0.1s
        </button>
        <button
          onClick={() => onAction(SimulationAction.RESET)}
          className="col-span-2 bg-slate-800 hover:bg-red-900/40 text-red-400 border border-red-900/30 py-2 rounded text-xs font-semibold transition mt-1 active:scale-95 uppercase"
        >
          Reset Scene
        </button>
      </div>
    </div>
  );
};

export default Controls;
