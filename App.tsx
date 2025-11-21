import React, { useState, useRef, useCallback, useEffect } from 'react';
import Controls from './components/Controls';
import Telemetry from './components/Telemetry';
import Simulation from './components/Simulation';
import { SimulationConfig, SimulationAction, TelemetryRefs } from './types';

const App: React.FC = () => {
  // Game State (Inputs)
  const [config, setConfig] = useState<SimulationConfig>({
    height: 60,
    gravity: 9.81,
    mass: 2.5,
  });

  // Action Trigger System (pass command to imperative simulation)
  const [actionTrigger, setActionTrigger] = useState<{ type: SimulationAction; count: number } | null>(null);

  // Refs for direct DOM manipulation by the Three.js loop
  const telemetryRefs = useRef<TelemetryRefs>({
    time: null,
    height: null,
    velocity: null,
    acceleration: null,
    tooltip: null,
    tooltipTitle: null,
    tooltipText: null,
  });

  const handleConfigChange = useCallback((key: keyof SimulationConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleAction = useCallback((action: SimulationAction) => {
    setActionTrigger((prev) => ({ type: action, count: (prev?.count || 0) + 1 }));
  }, []);

  // Attempt to typeset MathJax on mount
  useEffect(() => {
      if ((window as any).MathJax) {
          (window as any).MathJax.typesetPromise?.();
      }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900">
      
      {/* 3D Scene */}
      <Simulation 
        config={config} 
        telemetryRefs={telemetryRefs}
        actionTrigger={actionTrigger}
      />

      {/* UI Overlays */}
      <Controls 
        config={config} 
        onConfigChange={handleConfigChange} 
        onAction={handleAction} 
      />

      <Telemetry 
        telemetryRefs={telemetryRefs} 
      />
      
    </div>
  );
};

export default App;