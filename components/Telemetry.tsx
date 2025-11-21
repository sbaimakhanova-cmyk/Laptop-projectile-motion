import React, { useState } from 'react';
import { TelemetryRefs } from '../types';

interface TelemetryProps {
  telemetryRefs: React.MutableRefObject<TelemetryRefs>;
}

interface LogEntry {
  time: string;
  height: string;
  velocity: string;
}

const Telemetry: React.FC<TelemetryProps> = ({ telemetryRefs }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const handleLog = () => {
    if (!telemetryRefs.current) return;
    const t = telemetryRefs.current.time?.textContent || "0.00 s";
    const h = telemetryRefs.current.height?.textContent || "0.00 m";
    const v = telemetryRefs.current.velocity?.textContent || "0.00 m/s";
    
    // Extract pure numbers if preferred, or keep strings. Strings are fine for display.
    // Using numeric strings from DOM
    const entry: LogEntry = {
        time: t.replace(' s', ''),
        height: h.replace(' m', ''),
        velocity: v.replace(' m/s', '')
    };
    
    setLogs(prev => [entry, ...prev]);
  };

  const handleClear = () => {
      setLogs([]);
  };

  return (
    <div className="absolute top-6 right-6 w-80 z-20 flex flex-col gap-4 max-h-[90vh] pointer-events-none">
        {/* Enable pointer events for children */}
        
        {/* Live Telemetry */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-5 pointer-events-auto">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Telemetry</h2>
            <div className="space-y-3 font-mono text-sm text-slate-200">
                <div className="flex justify-between items-end border-b border-slate-700 pb-1">
                    <span className="text-slate-400 text-xs font-sans">TIME (t)</span>
                    <span
                        ref={(el) => { if (telemetryRefs.current) telemetryRefs.current.time = el; }}
                        className="text-xl font-bold text-white"
                    >
                        0.00 s
                    </span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-700 pb-1">
                    <span className="text-slate-400 text-xs font-sans">HEIGHT y(t)</span>
                    <span
                        ref={(el) => { if (telemetryRefs.current) telemetryRefs.current.height = el; }}
                        className="text-lg text-orange-400 font-bold"
                    >
                        60.00 m
                    </span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-700 pb-1">
                    <span className="text-slate-400 text-xs font-sans">VELOCITY v(t)</span>
                    <span
                        ref={(el) => { if (telemetryRefs.current) telemetryRefs.current.velocity = el; }}
                        className="text-lg text-cyan-400 font-bold"
                    >
                        0.00 m/s
                    </span>
                </div>
                <div className="flex justify-between items-end">
                    <span className="text-slate-400 text-xs font-sans">ACCELERATION a</span>
                    <span
                        ref={(el) => { if (telemetryRefs.current) telemetryRefs.current.acceleration = el; }}
                        className="text-lg text-yellow-400 font-bold"
                    >
                        9.81 m/s²
                    </span>
                </div>
            </div>
        </div>

        {/* Measurement Log */}
        <div className="bg-slate-900/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] p-5 flex-1 flex flex-col overflow-hidden min-h-[250px] pointer-events-auto">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Measurement Log</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={handleLog}
                        className="bg-green-700 hover:bg-green-600 text-white text-[10px] px-2 py-1 rounded transition active:scale-95 font-bold"
                    >
                        LOG POINT
                    </button>
                    <button 
                        onClick={handleClear}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[10px] px-2 py-1 rounded transition active:scale-95 font-bold"
                    >
                        CLEAR
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-slate-400 border-b border-slate-600 pb-2 mb-2 text-center">
                <div>TIME (s)</div>
                <div>HEIGHT (m)</div>
                <div>VEL (m/s)</div>
            </div>
            
            <div className="overflow-y-auto custom-scroll flex-1">
                {logs.length === 0 ? (
                    <div className="text-center text-slate-600 text-xs mt-4 italic">
                        No data.<br/>Press "LOG POINT".
                    </div>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-1 text-[11px] font-mono text-slate-300 py-1 border-b border-slate-700/50 hover:bg-white/5">
                            <div className="text-center">{log.time}</div>
                            <div className="text-center text-orange-400">{log.height}</div>
                            <div className="text-center text-cyan-400">{log.velocity}</div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Formula */}
        <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700 pointer-events-auto">
             <div className="text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <span>{'$$y = y_0 - \\frac{1}{2}gt^2$$'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                    <span>{'$$v = g \\cdot t$$'}</span>
                </div>
            </div>
        </div>

    </div>
  );
};

export default Telemetry;