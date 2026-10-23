import type { 
  LevelData, Probe, Vector2D, MissionResult, Relic 
} from "./types";
import { 
  simulateTrajectory, 
  calculateGravityAcceleration, 
  MAX_CAPTURE_SPEED,
  type TrajectoryResult 
} from "./physics";
import { celestialSound } from "./sound";
import { generateOdysseySector } from "./levels";

export class OrbitalEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public currentLevel: LevelData;
  public probe: Probe;
  public trajectoryPreview: TrajectoryResult | null = null;

  // Slingshot Pull & Calibration Constants
  public static readonly MAX_PULL_RADIUS = 150;
  public static readonly MIN_PULL_THRESHOLD = 14;
  public static readonly MIN_LAUNCH_SPEED = 40;
  public static readonly MAX_LAUNCH_SPEED = 320;

  // Interaction & Aiming
  private isAiming: boolean = false;
  private aimCurrentPos: Vector2D = { x: 0, y: 0 };
  private timeWarp: number = 1; // 1x, 2x, 4x

  // Loop & Lifecycle
  private animId: number = 0;
  private lastTimestamp: number = 0;
  public isRunning: boolean = false;

  // Starfield & Spacetime Grid
  private stars: { x: number; y: number; r: number; alpha: number; twinkleSpeed: number }[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; color: string; life: number; maxLife: number }[] = [];

  // UI Callbacks
  public onStateUpdate?: (probe: Probe, speedKmh: number, relicsCount: number, totalRelics: number) => void;
  public onMissionVictory?: (result: MissionResult) => void;
  public onMissionFailed?: (reason: string) => void;

  constructor(canvas: HTMLCanvasElement, level: LevelData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.currentLevel = JSON.parse(JSON.stringify(level)); // Deep clone level state

    this.probe = {
      x: this.currentLevel.startPos.x,
      y: this.currentLevel.startPos.y,
      vx: 0,
      vy: 0,
      radius: 9,
      trail: [],
      fuel: this.currentLevel.initialFuel,
      maxFuel: this.currentLevel.initialFuel,
      state: "docked",
      flightTime: 0,
    };

    this.initStarfield();
    this.setupEventListeners();
  }

  private initStarfield() {
    this.stars = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        r: Math.random() * 1.6 + 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 2 + 1,
      });
    }
  }

  public ghostTrail: Vector2D[] = [];
  public isOdysseyMode: boolean = false;
  public odysseySector: number = 1;
  public onOdysseyWarp?: (nextSector: number, fuelRemaining: number) => void;

  public setLevel(newLevel: LevelData) {
    this.currentLevel = JSON.parse(JSON.stringify(newLevel));
    this.resetProbe();
  }

  public resetProbe() {
    if (this.probe.trail.length > 4) {
      this.ghostTrail = this.probe.trail.map((t) => ({ x: t.x, y: t.y }));
    }
    this.probe = {
      x: this.currentLevel.startPos.x,
      y: this.currentLevel.startPos.y,
      vx: 0,
      vy: 0,
      radius: 9,
      trail: [],
      fuel: this.currentLevel.initialFuel,
      maxFuel: this.currentLevel.initialFuel,
      state: "docked",
      flightTime: 0,
      isAerobraking: false,
    };
    this.trajectoryPreview = null;
    this.isAiming = false;
    this.currentLevel.relics.forEach((r) => (r.collected = false));
  }

  public setTimeWarp(warp: number) {
    this.timeWarp = warp;
  }

  public applyRcsImpulse(dir: "up" | "down" | "left" | "right") {
    if (this.probe.state !== "flying" || this.probe.fuel <= 0) return;

    const impulse = 18;
    const fuelCost = 6;
    this.probe.fuel = Math.max(0, this.probe.fuel - fuelCost);
    celestialSound.playThruster();

    let ex = 0;
    let ey = 0;

    if (dir === "up") {
      this.probe.vy -= impulse;
      ey = 1;
    } else if (dir === "down") {
      this.probe.vy += impulse;
      ey = -1;
    } else if (dir === "left") {
      this.probe.vx -= impulse;
      ex = 1;
    } else if (dir === "right") {
      this.probe.vx += impulse;
      ex = -1;
    }

    // Spawn exhaust particles in opposite direction
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.probe.x,
        y: this.probe.y,
        vx: ex * 60 + (Math.random() - 0.5) * 20,
        vy: ey * 60 + (Math.random() - 0.5) * 20,
        color: "#38bdf8",
        life: 0.3,
        maxLife: 0.3,
      });
    }
  }

  // ── Input & Aiming ────────────────────────────────────────────────────────
  private setupEventListeners() {
    const getPos = (e: MouseEvent | Touch): Vector2D => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handlePointerDown = (pos: Vector2D, isTouch = false) => {
      if (this.probe.state !== "docked") return;
      const dist = Math.hypot(pos.x - this.probe.x, pos.y - this.probe.y);
      // Forgiving grab radius for touch screens & high-DPI displays
      const threshold = isTouch ? 180 : 130;
      if (dist < threshold) {
        this.isAiming = true;
        this.aimCurrentPos = pos;
        this.updateAimPreview();
      }
    };

    const handlePointerMove = (pos: Vector2D) => {
      if (!this.isAiming) return;
      this.aimCurrentPos = pos;
      this.updateAimPreview();
    };

    const handlePointerUp = () => {
      if (!this.isAiming) return;
      this.isAiming = false;

      const aim = this.getAimData();
      if (aim.isBeyondThreshold) {
        this.probe.vx = aim.launchVel.x;
        this.probe.vy = aim.launchVel.y;
        this.probe.state = "flying";
        this.trajectoryPreview = null;
        celestialSound.playLaunch();
      } else {
        this.trajectoryPreview = null;
      }
    };

    this.canvas.addEventListener("mousedown", (e) => handlePointerDown(getPos(e), false));
    window.addEventListener("mousemove", (e) => handlePointerMove(getPos(e)));
    window.addEventListener("mouseup", () => handlePointerUp());

    // Robust touch slingshot aiming with native gesture prevention
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        const pos = getPos(e.touches[0]);
        const dist = Math.hypot(pos.x - this.probe.x, pos.y - this.probe.y);
        if (dist < 180 && this.probe.state === "docked") {
          e.preventDefault();
          handlePointerDown(pos, true);
        }
      }
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      if (this.isAiming && e.touches.length > 0) {
        e.preventDefault();
        handlePointerMove(getPos(e.touches[0]));
      }
    }, { passive: false });

    window.addEventListener("touchend", (e) => {
      if (this.isAiming) {
        e.preventDefault();
        handlePointerUp();
      }
    }, { passive: false });

    window.addEventListener("touchcancel", () => {
      if (this.isAiming) {
        handlePointerUp();
      }
    });

    // Keyboard RCS controls
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") this.applyRcsImpulse("up");
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") this.applyRcsImpulse("down");
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.applyRcsImpulse("left");
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.applyRcsImpulse("right");
    });
  }

  /**
   * Evaluates slingshot aiming geometry, radial boundary clamping, power scaling, and launch vector.
   */
  public getAimData() {
    const rawDx = this.probe.x - this.aimCurrentPos.x;
    const rawDy = this.probe.y - this.aimCurrentPos.y;
    const rawDist = Math.hypot(rawDx, rawDy);
    const launchAngle = Math.atan2(rawDy, rawDx); // forward launch direction

    const isBeyondThreshold = rawDist >= OrbitalEngine.MIN_PULL_THRESHOLD;
    const pullRatio = isBeyondThreshold
      ? Math.min(
          1,
          (rawDist - OrbitalEngine.MIN_PULL_THRESHOLD) /
            (OrbitalEngine.MAX_PULL_RADIUS - OrbitalEngine.MIN_PULL_THRESHOLD)
        )
      : 0;

    const launchSpeed =
      OrbitalEngine.MIN_LAUNCH_SPEED +
      (OrbitalEngine.MAX_LAUNCH_SPEED - OrbitalEngine.MIN_LAUNCH_SPEED) * pullRatio;
    const isFullForce = pullRatio >= 0.98;

    // Handle clamped to MAX_PULL_RADIUS along the pull angle
    const pullAngle = Math.atan2(
      this.aimCurrentPos.y - this.probe.y,
      this.aimCurrentPos.x - this.probe.x
    );
    const clampedDist = Math.min(rawDist, OrbitalEngine.MAX_PULL_RADIUS);
    const handlePos: Vector2D = {
      x: this.probe.x + Math.cos(pullAngle) * clampedDist,
      y: this.probe.y + Math.sin(pullAngle) * clampedDist,
    };

    const launchVel: Vector2D = {
      x: Math.cos(launchAngle) * launchSpeed,
      y: Math.sin(launchAngle) * launchSpeed,
    };

    return {
      handlePos,
      pullRatio,
      launchSpeed,
      launchVel,
      launchAngle,
      rawDist,
      isBeyondThreshold,
      isFullForce,
    };
  }

  private updateAimPreview() {
    const aim = this.getAimData();

    if (!aim.isBeyondThreshold) {
      this.trajectoryPreview = null;
      return;
    }

    this.trajectoryPreview = simulateTrajectory(
      { x: this.probe.x, y: this.probe.y },
      aim.launchVel,
      this.currentLevel.bodies,
      this.currentLevel.target,
      this.currentLevel.relics
    );

    // Audio tension feedback (smoothly mapped 0..1)
    celestialSound.playTension(aim.pullRatio);
  }

  // ── Main Engine Loop ──────────────────────────────────────────────────────
  public start() {
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    celestialSound.startBgm();
    this.loop(this.lastTimestamp);
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animId);
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    const delta = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000) * this.timeWarp;
    this.lastTimestamp = timestamp;

    this.update(delta);
    this.render();

    this.animId = requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    // 1. Update Probe in flight
    if (this.probe.state === "flying") {
      this.probe.flightTime += delta;
      this.probe.isAerobraking = false;

      // Record trail
      this.probe.trail.unshift({ x: this.probe.x, y: this.probe.y, alpha: 1 });
      if (this.probe.trail.length > 70) this.probe.trail.pop();
      for (const t of this.probe.trail) t.alpha -= delta * 0.7;

      // Gravity acceleration integration
      const acc = calculateGravityAcceleration(
        { x: this.probe.x, y: this.probe.y },
        this.currentLevel.bodies
      );
      this.probe.vx += acc.x * delta;
      this.probe.vy += acc.y * delta;
      this.probe.x += this.probe.vx * delta;
      this.probe.y += this.probe.vy * delta;

      // 2. Celestial Body interactions
      for (const b of this.currentLevel.bodies) {
        const d = Math.hypot(b.x - this.probe.x, b.y - this.probe.y);

        if (b.type === "blackhole") {
          const horizon = b.eventHorizonRadius || b.radius * 0.7;
          if (d <= horizon) {
            this.handleCrash("Singularity Event Horizon: Crushed by gravitational tidal forces!");
            return;
          }
        } else if (b.type === "wormhole" && b.exitWormholeId) {
          if (d <= b.radius) {
            const exit = this.currentLevel.bodies.find((w) => w.id === b.exitWormholeId);
            if (exit) {
              this.probe.x = exit.x;
              this.probe.y = exit.y;
              celestialSound.playWormhole();
              this.addShockwave(exit.x, exit.y, "#ec4899");
            }
          }
        } else if (b.type === "nebula") {
          if (d <= b.radius) {
            const drag = b.dragCoefficient || 0.4;
            this.probe.vx *= 1 - drag * delta;
            this.probe.vy *= 1 - drag * delta;
          }
        } else {
          // Standard planet collision
          if (d <= b.radius) {
            this.handleCrash(`Impact with ${b.name}: Atmospheric disintegration.`);
            return;
          }
        }

        // Atmospheric Aerobraking drag & plasma friction sparks
        if (b.hasAtmosphere) {
          const atmoRadius = b.atmosphereRadius || b.radius * 1.65;
          if (d <= atmoRadius && d > b.radius) {
            this.probe.isAerobraking = true;
            const atmoDepth = 1 - (d - b.radius) / (atmoRadius - b.radius);
            const drag = 0.45 * atmoDepth;
            this.probe.vx *= 1 - drag * delta;
            this.probe.vy *= 1 - drag * delta;
            celestialSound.playAerobrake();

            // Emit plasma friction sparks trailing behind probe
            const angle = Math.atan2(this.probe.vy, this.probe.vx) + Math.PI + (Math.random() - 0.5) * 0.8;
            const sparkSpeed = Math.hypot(this.probe.vx, this.probe.vy) * 0.35 + 20;
            this.particles.push({
              x: this.probe.x + (Math.random() - 0.5) * 6,
              y: this.probe.y + (Math.random() - 0.5) * 6,
              vx: Math.cos(angle) * sparkSpeed,
              vy: Math.sin(angle) * sparkSpeed,
              color: Math.random() > 0.4 ? "#f97316" : "#fbbf24",
              life: 0.22,
              maxLife: 0.22,
            });
          }
        }
      }

      // 3. Relic collections with Fuel Recovery bonus
      for (const r of this.currentLevel.relics) {
        if (!r.collected) {
          const dist = Math.hypot(r.x - this.probe.x, r.y - this.probe.y);
          if (dist <= r.radius + this.probe.radius + 8) {
            r.collected = true;
            celestialSound.playRelic();
            this.addShockwave(r.x, r.y, "#38bdf8");
            // Award +25 fuel boost
            this.probe.fuel = Math.min(this.probe.maxFuel, this.probe.fuel + 25);
          }
        }
      }

      // 4. Target Beacon entry check
      const target = this.currentLevel.target;
      const distToTarget = Math.hypot(target.x - this.probe.x, target.y - this.probe.y);
      if (distToTarget <= target.captureRadius) {
        const currentSpeed = Math.hypot(this.probe.vx, this.probe.vy);
        if (currentSpeed <= MAX_CAPTURE_SPEED * 1.5) {
          this.handleVictory();
          return;
        }
      }

      // 5. Deep Space Escape check
      if (
        this.probe.x < -200 ||
        this.probe.x > this.canvas.width + 200 ||
        this.probe.y < -200 ||
        this.probe.y > this.canvas.height + 200
      ) {
        this.handleCrash("Trajectory Escaped: Probe lost in deep space vacuum.");
        return;
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Notify UI
    if (this.onStateUpdate) {
      const speedKmh = Math.round(Math.hypot(this.probe.vx, this.probe.vy) * 25);
      const relicsCount = this.currentLevel.relics.filter((r) => r.collected).length;
      this.onStateUpdate(this.probe, speedKmh, relicsCount, this.currentLevel.relics.length);
    }
  }

  private handleVictory() {
    if (this.probe.trail.length > 4) {
      this.ghostTrail = this.probe.trail.map((t) => ({ x: t.x, y: t.y }));
    }

    if (this.isOdysseyMode) {
      this.probe.state = "cleared";
      celestialSound.playVictory();
      celestialSound.playWarpJump();
      this.addShockwave(this.currentLevel.target.x, this.currentLevel.target.y, "#38bdf8");

      this.odysseySector++;
      const fuelBonus = Math.min(200, Math.round(this.probe.fuel + 45));
      if (this.onOdysseyWarp) {
        this.onOdysseyWarp(this.odysseySector, fuelBonus);
      }
      setTimeout(() => {
        const nextLevel = generateOdysseySector(this.odysseySector, fuelBonus);
        this.setLevel(nextLevel);
      }, 1200);
      return;
    }

    this.probe.state = "cleared";
    celestialSound.playVictory();
    this.addShockwave(this.currentLevel.target.x, this.currentLevel.target.y, "#4ade80");

    const relicsCount = this.currentLevel.relics.filter((r) => r.collected).length;
    const totalRelics = this.currentLevel.relics.length;

    // Calculate stars: 1 star for reaching beacon, +1 for all relics, +1 for fuel/time conservation
    let stars = 1;
    if (relicsCount === totalRelics) stars++;
    if (this.probe.fuel >= this.currentLevel.threeStarFuel && this.probe.flightTime <= this.currentLevel.parTime * 1.3) {
      stars++;
    }

    const result: MissionResult = {
      stars,
      cleared: true,
      fuelRemaining: Math.round(this.probe.fuel),
      timeTaken: Math.round(this.probe.flightTime * 10) / 10,
      relicsCollected: relicsCount,
      totalRelics,
    };

    if (this.onMissionVictory) {
      this.onMissionVictory(result);
    }
  }

  private handleCrash(reason: string) {
    if (this.probe.trail.length > 4) {
      this.ghostTrail = this.probe.trail.map((t) => ({ x: t.x, y: t.y }));
    }
    this.probe.state = "crashed";
    celestialSound.playCrash();
    this.addShockwave(this.probe.x, this.probe.y, "#ef4444");

    if (this.onMissionFailed) {
      this.onMissionFailed(reason);
    }
  }

  private addShockwave(x: number, y: number, color: string) {
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const speed = 70 + Math.random() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.6,
        maxLife: 0.6,
      });
    }
  }

  // ── Render Pipeline ───────────────────────────────────────────────────────
  private render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Starfield Background
    this.renderStarfield();

    // 2. Gravitational Equipotential Spacetime Grid
    this.renderSpacetimeGrid();

    // 3. Celestial Bodies
    for (const b of this.currentLevel.bodies) {
      this.renderCelestialBody(b);
    }

    // 4. Starlight Relics
    for (const r of this.currentLevel.relics) {
      this.renderRelic(r);
    }

    // 5. Target Beacon
    this.renderTargetBeacon(this.currentLevel.target);

    // 5.5 Ghost Trajectory (Previous attempt)
    this.renderGhostTrail();

    // 6. Trajectory Predictive Arc (Slingshot preview)
    if (this.trajectoryPreview && this.probe.state === "docked") {
      this.renderTrajectoryPreview(this.trajectoryPreview);
    }

    // 7. Slingshot Pull Vector Arrow
    if (this.isAiming && this.probe.state === "docked") {
      this.renderAimSlingshot();
    }

    // 8. Probe & Exhaust Ribbon
    this.renderProbe();

    // 9. Particle Bursts
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderGhostTrail() {
    const { ctx } = this;
    if (this.ghostTrail.length < 2) return;

    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 6]);

    ctx.beginPath();
    ctx.moveTo(this.ghostTrail[0].x, this.ghostTrail[0].y);
    for (let i = 1; i < this.ghostTrail.length; i++) {
      ctx.lineTo(this.ghostTrail[i].x, this.ghostTrail[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Small label near midpoint of ghost trail
    const midIdx = Math.floor(this.ghostTrail.length / 2);
    const midPt = this.ghostTrail[midIdx];
    if (midPt) {
      ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("PREV TRAJECTORY", midPt.x, midPt.y - 6);
    }
    ctx.restore();
  }

  private renderStarfield() {
    const { ctx } = this;
    for (const s of this.stars) {
      const twinkle = Math.sin(performance.now() * 0.002 * s.twinkleSpeed) * 0.25 + 0.75;
      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderSpacetimeGrid() {
    const { ctx, canvas } = this;
    ctx.strokeStyle = "rgba(99, 102, 241, 0.04)";
    ctx.lineWidth = 1;

    const step = 60;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  }

  private renderCelestialBody(b: LevelData["bodies"][0]) {
    const { ctx } = this;

    // Gravitational equipotential rings (Spacetime warping)
    const eqCount = 3;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    const wave = (performance.now() * 0.001) % 1;
    for (let i = 1; i <= eqCount; i++) {
      const radiusMult = 1.35 + i * 0.55 + wave * 0.12;
      const alpha = Math.max(0, 0.20 - i * 0.045);
      ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * radiusMult, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Glowing Halo or Atmospheric Envelope
    if (b.hasAtmosphere) {
      const atmoR = b.atmosphereRadius || b.radius * 1.65;
      const atmoGrad = ctx.createRadialGradient(b.x, b.y, b.radius, b.x, b.y, atmoR);
      atmoGrad.addColorStop(0, "rgba(56, 189, 248, 0.45)");
      atmoGrad.addColorStop(0.65, "rgba(56, 189, 248, 0.15)");
      atmoGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, atmoR, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric entry boundary dashed halo
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, atmoR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      const glowGrad = ctx.createRadialGradient(b.x, b.y, b.radius * 0.5, b.x, b.y, b.radius * 2.2);
      glowGrad.addColorStop(0, b.glowColor);
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (b.type === "blackhole") {
      // Accretion disk
      ctx.strokeStyle = "rgba(251, 146, 60, 0.6)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 1.25, 0, Math.PI * 2);
      ctx.stroke();

      // Singularity Event Horizon core
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.eventHorizonRadius || b.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (b.type === "pulsar") {
      // Repulsor shockwave ripples
      const pulseTime = (performance.now() * 0.003) % (Math.PI * 2);
      const rippleR = b.radius + Math.sin(pulseTime) * 16 + 16;
      ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, rippleR, 0, Math.PI * 2);
      ctx.stroke();

      // Pulsar core
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === "wormhole") {
      // Spacetime vortex swirl
      ctx.strokeStyle = b.glowColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Terrestrial or Gas Giant
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Planetary rings
      if (b.rings) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.radius * 1.9, b.radius * 0.6, Math.PI / 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Name label
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(b.name, b.x, b.y + b.radius + 18);
  }

  private renderRelic(r: Relic) {
    if (r.collected) return;
    const { ctx } = this;
    const time = performance.now() * 0.003;
    const floatY = Math.sin(time) * 4;

    ctx.save();
    ctx.translate(r.x, r.y + floatY);
    ctx.rotate(time * 0.8);

    // Glowing diamond
    ctx.fillStyle = "#38bdf8";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -r.radius);
    ctx.lineTo(r.radius, 0);
    ctx.lineTo(0, r.radius);
    ctx.lineTo(-r.radius, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderTargetBeacon(t: LevelData["target"]) {
    const { ctx } = this;
    const time = performance.now() * 0.003;
    const pulseR = t.captureRadius + Math.sin(time * 2) * 4;

    // Glowing landing zone
    ctx.strokeStyle = "rgba(74, 222, 128, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(t.x, t.y, pulseR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Beacon Core
    ctx.fillStyle = "#22c55e";
    ctx.shadowColor = "#4ade80";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("BEACON", t.x, t.y + 4);
  }

  private renderTrajectoryPreview(traj: TrajectoryResult) {
    const { ctx } = this;
    if (traj.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(traj.points[0].x, traj.points[0].y);
    for (let i = 1; i < traj.points.length; i++) {
      ctx.lineTo(traj.points[i].x, traj.points[i].y);
    }

    // Color based on outcome: Green = reaches target, Red = crashes into planet, Cyan = in flight
    let strokeColor = "rgba(56, 189, 248, 0.65)";
    if (traj.outcome === "target") strokeColor = "rgba(74, 222, 128, 0.85)";
    if (traj.outcome === "crash") strokeColor = "rgba(248, 113, 113, 0.85)";

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private renderAimSlingshot() {
    const { ctx } = this;
    const aim = this.getAimData();
    const maxR = OrbitalEngine.MAX_PULL_RADIUS;

    ctx.save();

    // 1. Concentric calibration guide rings (33%, 66%)
    const ringSteps = [0.33, 0.66];
    ctx.setLineDash([2, 6]);
    ctx.lineWidth = 1;
    for (const step of ringSteps) {
      ctx.strokeStyle = "rgba(99, 102, 241, 0.12)";
      ctx.beginPath();
      ctx.arc(this.probe.x, this.probe.y, maxR * step, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Maximum Pull Boundary Ring (100% Full Force perimeter)
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = aim.isFullForce ? 2.5 : 1.5;
    ctx.strokeStyle = aim.isFullForce
      ? "rgba(34, 197, 94, 0.75)"
      : "rgba(99, 102, 241, 0.35)";
    ctx.beginPath();
    ctx.arc(this.probe.x, this.probe.y, maxR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Full force boundary pulse glow when maxed
    if (aim.isFullForce) {
      ctx.strokeStyle = "rgba(74, 222, 128, 0.25)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(this.probe.x, this.probe.y, maxR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Elastic Slingshot Tether Bands (from probe left/right panels to handle)
    const bandColor = aim.isFullForce
      ? "rgba(74, 222, 128, 0.9)"
      : `rgba(56, 189, 248, ${0.45 + aim.pullRatio * 0.45})`;

    ctx.strokeStyle = bandColor;
    ctx.lineWidth = 2 + aim.pullRatio * 1.5;
    ctx.beginPath();
    ctx.moveTo(this.probe.x - 10, this.probe.y);
    ctx.lineTo(aim.handlePos.x, aim.handlePos.y);
    ctx.lineTo(this.probe.x + 10, this.probe.y);
    ctx.stroke();

    // 4. Forward Launch Vector Arrow (pointing opposite of drag)
    if (aim.isBeyondThreshold) {
      const arrowLen = 30 + aim.pullRatio * 40;
      const fwdX = this.probe.x + Math.cos(aim.launchAngle) * arrowLen;
      const fwdY = this.probe.y + Math.sin(aim.launchAngle) * arrowLen;

      // Glow line
      ctx.strokeStyle = aim.isFullForce ? "#4ade80" : "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(this.probe.x, this.probe.y);
      ctx.lineTo(fwdX, fwdY);
      ctx.stroke();

      // Arrow head
      const headLen = 8;
      const headAngle = Math.PI / 6;
      ctx.fillStyle = aim.isFullForce ? "#4ade80" : "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(fwdX, fwdY);
      ctx.lineTo(
        fwdX - headLen * Math.cos(aim.launchAngle - headAngle),
        fwdY - headLen * Math.sin(aim.launchAngle - headAngle)
      );
      ctx.lineTo(
        fwdX - headLen * Math.cos(aim.launchAngle + headAngle),
        fwdY - headLen * Math.sin(aim.launchAngle + headAngle)
      );
      ctx.closePath();
      ctx.fill();
    }

    // 5. Pull Handle
    ctx.shadowColor = aim.isFullForce ? "#22c55e" : "#6366f1";
    ctx.shadowBlur = aim.isFullForce ? 14 : 8;
    ctx.fillStyle = aim.isFullForce ? "#22c55e" : "#6366f1";
    ctx.beginPath();
    ctx.arc(aim.handlePos.x, aim.handlePos.y, aim.isFullForce ? 9 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Handle white core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(aim.handlePos.x, aim.handlePos.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // 6. Floating Precision HUD Badge
    const badgeText = !aim.isBeyondThreshold
      ? "RELEASE TO CANCEL"
      : aim.isFullForce
      ? "MAX THRUST (100%)"
      : `THRUST ${Math.round(aim.pullRatio * 100)}% • ${Math.round(aim.launchSpeed * 25)} km/s`;

    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    const textWidth = ctx.measureText(badgeText).width;
    const badgeX = aim.handlePos.x - textWidth / 2 - 8;
    const badgeY = aim.handlePos.y + 18;

    ctx.fillStyle = "rgba(10, 15, 30, 0.88)";
    ctx.strokeStyle = aim.isFullForce ? "rgba(34, 197, 94, 0.8)" : "rgba(99, 102, 241, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === "function") {
      (ctx as any).roundRect(badgeX, badgeY, textWidth + 16, 20, 6);
    } else {
      ctx.rect(badgeX, badgeY, textWidth + 16, 20);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = aim.isFullForce ? "#4ade80" : !aim.isBeyondThreshold ? "#94a3b8" : "#e0e7ff";
    ctx.textAlign = "left";
    ctx.fillText(badgeText, badgeX + 8, badgeY + 14);

    ctx.restore();
  }

  private renderProbe() {
    const { ctx } = this;

    // Trail ribbon
    if (this.probe.trail.length > 1) {
      for (let i = 0; i < this.probe.trail.length - 1; i++) {
        const pt = this.probe.trail[i];
        const nextPt = this.probe.trail[i + 1];
        ctx.strokeStyle = `rgba(56, 189, 248, ${pt.alpha * 0.7})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(nextPt.x, nextPt.y);
        ctx.stroke();
      }
    }

    // Satellite Probe body
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.probe.x, this.probe.y, this.probe.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Solar panels
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(this.probe.x - 14, this.probe.y - 2, 6, 4);
    ctx.fillRect(this.probe.x + 8, this.probe.y - 2, 6, 4);
  }
}
