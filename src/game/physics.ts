import type { Vector2D, CelestialBody, TargetBeacon, Relic } from "./types";

export const GRAVITY_CONSTANT = 4500;
export const MAX_CAPTURE_SPEED = 280; // Max speed allowed to dock into target beacon without slingshotting through

export interface TrajectoryPoint {
  x: number;
  y: number;
  willHitTarget?: boolean;
  willCrash?: boolean;
}

export interface TrajectoryResult {
  points: TrajectoryPoint[];
  outcome: "target" | "crash" | "escaped" | "in_flight";
  hitBodyName?: string;
}

/**
 * Calculates net gravitational acceleration vector at a given position.
 */
export function calculateGravityAcceleration(
  pos: Vector2D,
  bodies: CelestialBody[]
): Vector2D {
  let ax = 0;
  let ay = 0;

  for (const b of bodies) {
    if (b.type === "nebula" || b.type === "wormhole") continue;

    const dx = b.x - pos.x;
    const dy = b.y - pos.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    // Softening parameter to prevent division by zero near core
    const softening = 120;
    const softenedDistSq = distSq + softening;

    // F = (G * M) / r^2
    const force = (GRAVITY_CONSTANT * b.mass) / softenedDistSq;
    ax += (force * dx) / dist;
    ay += (force * dy) / dist;
  }

  return { x: ax, y: ay };
}

/**
 * Simulates future trajectory for the slingshot targeting preview.
 */
export function simulateTrajectory(
  startPos: Vector2D,
  initialVel: Vector2D,
  bodies: CelestialBody[],
  target: TargetBeacon,
  _relics: Relic[],
  maxSteps: number = 480,
  stepDelta: number = 0.025
): TrajectoryResult {
  const points: TrajectoryPoint[] = [{ x: startPos.x, y: startPos.y }];
  let x = startPos.x;
  let y = startPos.y;
  let vx = initialVel.x;
  let vy = initialVel.y;
  let outcome: TrajectoryResult["outcome"] = "in_flight";
  let hitBodyName: string | undefined;

  for (let step = 0; step < maxSteps; step++) {
    // 1. Check celestial body collisions
    for (const b of bodies) {
      const d = Math.hypot(b.x - x, b.y - y);

      if (b.type === "blackhole") {
        const horizon = b.eventHorizonRadius || b.radius * 0.7;
        if (d <= horizon) {
          points.push({ x, y, willCrash: true });
          return { points, outcome: "crash", hitBodyName: b.name };
        }
      } else if (b.type !== "nebula" && b.type !== "wormhole") {
        if (d <= b.radius) {
          points.push({ x, y, willCrash: true });
          return { points, outcome: "crash", hitBodyName: b.name };
        }
      } else if (b.type === "wormhole" && b.exitWormholeId) {
        if (d <= b.radius) {
          const exit = bodies.find((w) => w.id === b.exitWormholeId);
          if (exit) {
            x = exit.x;
            y = exit.y;
            // Boost outward from exit
            const speed = Math.hypot(vx, vy);
            vx = (vx / speed) * (speed * 1.05);
            vy = (vy / speed) * (speed * 1.05);
          }
        }
      } else if (b.type === "nebula") {
        if (d <= b.radius) {
          const drag = b.dragCoefficient || 0.4;
          vx *= 1 - drag * stepDelta;
          vy *= 1 - drag * stepDelta;
        }
      }

      // Atmospheric aerobraking drag
      if (b.hasAtmosphere) {
        const atmoRadius = b.atmosphereRadius || b.radius * 1.65;
        if (d <= atmoRadius && d > b.radius) {
          const atmoDepth = 1 - (d - b.radius) / (atmoRadius - b.radius);
          const drag = 0.45 * atmoDepth;
          vx *= 1 - drag * stepDelta;
          vy *= 1 - drag * stepDelta;
        }
      }
    }

    // 2. Check Target Beacon entry
    const distToTarget = Math.hypot(target.x - x, target.y - y);
    if (distToTarget <= target.captureRadius) {
      const currentSpeed = Math.hypot(vx, vy);
      if (currentSpeed <= MAX_CAPTURE_SPEED * 1.5) {
        points.push({ x, y, willHitTarget: true });
        return { points, outcome: "target" };
      }
    }

    // 3. Gravity integration (Velocity Verlet approximation)
    const acc = calculateGravityAcceleration({ x, y }, bodies);
    vx += acc.x * stepDelta;
    vy += acc.y * stepDelta;
    x += vx * stepDelta;
    y += vy * stepDelta;

    // Record sample points every 2 steps to optimize line rendering
    if (step % 2 === 0) {
      points.push({ x, y });
    }

    // Check boundary escape (deep space loss)
    if (Math.abs(x) > 3000 || Math.abs(y) > 3000) {
      outcome = "escaped";
      break;
    }
  }

  return { points, outcome, hitBodyName };
}
