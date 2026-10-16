export interface Vector2D {
  x: number;
  y: number;
}

export type CelestialBodyType = 
  | "planet" 
  | "gas_giant" 
  | "blackhole" 
  | "pulsar" 
  | "wormhole" 
  | "nebula" 
  | "asteroid";

export interface CelestialBody {
  id: string;
  type: CelestialBodyType;
  name: string;
  x: number;
  y: number;
  radius: number;
  mass: number; // positive = attraction, negative = repulsion
  color: string;
  glowColor: string;
  rings?: boolean;
  eventHorizonRadius?: number; // for black holes
  exitWormholeId?: string; // for wormhole pairs
  rotationSpeed?: number;
  pulsePhase?: number;
  dragCoefficient?: number; // for nebulas
}

export interface Relic {
  id: string;
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  angle: number;
}

export interface TargetBeacon {
  x: number;
  y: number;
  radius: number;
  captureRadius: number;
  pulse: number;
}

export interface Probe {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number; alpha: number }[];
  fuel: number;
  maxFuel: number;
  state: "docked" | "flying" | "cleared" | "crashed";
  flightTime: number;
  crashReason?: "planet_impact" | "event_horizon" | "lost_in_deep_space";
}

export interface LevelData {
  id: string;
  sector: number;
  title: string;
  subtitle: string;
  briefing: string;
  companion: "koji" | "mochi" | "kai";
  startPos: Vector2D;
  initialFuel: number;
  target: TargetBeacon;
  bodies: CelestialBody[];
  relics: Relic[];
  parTime: number;
  threeStarFuel: number;
}

export interface MissionResult {
  stars: number;
  cleared: boolean;
  fuelRemaining: number;
  timeTaken: number;
  relicsCollected: number;
  totalRelics: number;
}
