import * as THREE from 'three';

export interface SimulationConfig {
  height: number;
  gravity: number;
  mass: number;
}

export interface TelemetryRefs {
  time: HTMLSpanElement | null;
  height: HTMLSpanElement | null;
  velocity: HTMLSpanElement | null;
  acceleration: HTMLSpanElement | null;
  tooltip: HTMLDivElement | null;
  tooltipTitle: HTMLHeadingElement | null;
  tooltipText: HTMLParagraphElement | null;
}

export enum SimulationAction {
  START = 'START',
  PAUSE = 'PAUSE',
  STEP = 'STEP',
  RESET = 'RESET'
}

export interface SimulationState {
  t: number;
  y0: number;
  y: number;
  v: number;
  g: number;
  mass: number;
  running: boolean;
  paused: boolean;
  finished: boolean;
  cliffEdgeX: number;
  dropX: number;
  sharks: THREE.Group[];
}
