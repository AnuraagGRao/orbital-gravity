import type { LevelData, CelestialBody, Relic } from "./types";

export const CAMPAIGN_LEVELS: LevelData[] = [
  // ── SECTOR 1: SOLAR CRADLE ──────────────────────────────────────────────
  {
    id: "sec1_lvl1",
    sector: 1,
    title: "FIRST TRAJECTORY",
    subtitle: "Basic Orbital Curvature",
    briefing: "Welcome to orbital flight, Operator. A gentle terrestrial planet lies ahead. Drag to aim the launch vector and use the planet's gravity to bend your arc toward the beacon.",
    companion: "koji",
    startPos: { x: 180, y: 350 },
    initialFuel: 100,
    target: { x: 820, y: 350, radius: 26, captureRadius: 42, pulse: 0 },
    bodies: [
      {
        id: "planet_terra",
        type: "planet",
        name: "Terra Minor",
        x: 500,
        y: 260,
        radius: 46,
        mass: 38,
        color: "#0284c7",
        glowColor: "rgba(56, 189, 248, 0.4)",
        hasAtmosphere: true,
      } as CelestialBody,
    ],
    relics: [
      { id: "r1", x: 500, y: 170, radius: 10, collected: false, angle: 0 },
    ],
    parTime: 12,
    threeStarFuel: 60,
  },
  {
    id: "sec1_lvl2",
    sector: 1,
    title: "BINARY SLINGSHOT",
    subtitle: "Figure-8 Gravity Assist",
    briefing: "Two planetary bodies are caught in mutual orbit. Thread the needle between them to execute a slingshot boost toward the far beacon.",
    companion: "kai",
    startPos: { x: 160, y: 480 },
    initialFuel: 120,
    target: { x: 850, y: 180, radius: 26, captureRadius: 42, pulse: 0 },
    bodies: [
      {
        id: "planet_ares",
        type: "planet",
        name: "Ares-4",
        x: 420,
        y: 340,
        radius: 42,
        mass: 34,
        color: "#ea580c",
        glowColor: "rgba(249, 115, 22, 0.4)",
      },
      {
        id: "planet_zephyr",
        type: "gas_giant",
        name: "Zephyr Gas Giant",
        x: 620,
        y: 300,
        radius: 56,
        mass: 55,
        color: "#9333ea",
        glowColor: "rgba(168, 85, 247, 0.45)",
        rings: true,
      },
    ],
    relics: [
      { id: "r1", x: 420, y: 240, radius: 10, collected: false, angle: 0 },
      { id: "r2", x: 620, y: 410, radius: 10, collected: false, angle: 0 },
    ],
    parTime: 14,
    threeStarFuel: 70,
  },
  {
    id: "sec1_lvl3",
    sector: 1,
    title: "LAGRANGE EQUILIBRIUM",
    subtitle: "Triple Gravity Well",
    briefing: "Three celestial masses create intense gravitational cross-currents. Conserve your RCS fuel and ride the gravitational zero-point.",
    companion: "mochi",
    startPos: { x: 150, y: 280 },
    initialFuel: 140,
    target: { x: 860, y: 460, radius: 28, captureRadius: 44, pulse: 0 },
    bodies: [
      {
        id: "p1",
        type: "planet",
        name: "Kepler Core",
        x: 380,
        y: 200,
        radius: 38,
        mass: 32,
        color: "#059669",
        glowColor: "rgba(16, 185, 129, 0.4)",
      },
      {
        id: "p2",
        type: "planet",
        name: "Astra-9",
        x: 520,
        y: 450,
        radius: 45,
        mass: 42,
        color: "#0284c7",
        glowColor: "rgba(14, 165, 233, 0.4)",
      },
      {
        id: "p3",
        type: "gas_giant",
        name: "Onyx Titan",
        x: 680,
        y: 220,
        radius: 54,
        mass: 50,
        color: "#ca8a04",
        glowColor: "rgba(234, 179, 8, 0.4)",
        rings: true,
      },
    ],
    relics: [
      { id: "r1", x: 450, y: 310, radius: 10, collected: false, angle: 0 },
      { id: "r2", x: 600, y: 340, radius: 10, collected: false, angle: 0 },
      { id: "r3", x: 680, y: 130, radius: 10, collected: false, angle: 0 },
    ],
    parTime: 16,
    threeStarFuel: 75,
  },

  // ── SECTOR 2: PULSAR VOID ────────────────────────────────────────────────
  {
    id: "sec2_lvl4",
    sector: 2,
    title: "PULSAR REPULSION",
    subtitle: "Anti-Gravity Repulsion Fields",
    briefing: "Alert: An anti-gravity pulsar occupies this sector. It emits negative gravitational waves that push ships backward. Use it as a spring to bounce into the target zone.",
    companion: "kai",
    startPos: { x: 180, y: 480 },
    initialFuel: 140,
    target: { x: 840, y: 480, radius: 28, captureRadius: 44, pulse: 0 },
    bodies: [
      {
        id: "pulsar_v1",
        type: "pulsar",
        name: "Pulsar Echo-7",
        x: 500,
        y: 440,
        radius: 36,
        mass: -48, // Negative mass = repulsion!
        color: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.6)",
        pulsePhase: 0,
      },
      {
        id: "planet_attractor",
        type: "planet",
        name: "Anchor-1",
        x: 500,
        y: 180,
        radius: 48,
        mass: 45,
        color: "#6366f1",
        glowColor: "rgba(99, 102, 241, 0.45)",
      },
    ],
    relics: [
      { id: "r1", x: 500, y: 80, radius: 10, collected: false, angle: 0 },
      { id: "r2", x: 380, y: 340, radius: 10, collected: false, angle: 0 },
      { id: "r3", x: 620, y: 340, radius: 10, collected: false, angle: 0 },
    ],
    parTime: 18,
    threeStarFuel: 70,
  },
  {
    id: "sec2_lvl5",
    sector: 2,
    title: "SINGULARITY HORIZON",
    subtitle: "Micro Black Hole Relativistic Orbit",
    briefing: "A micro-black hole bends light and matter around its event horizon. Do NOT graze the black inner radius, or your probe will be crushed by extreme tidal forces.",
    companion: "koji",
    startPos: { x: 160, y: 220 },
    initialFuel: 150,
    target: { x: 860, y: 420, radius: 28, captureRadius: 44, pulse: 0 },
    bodies: [
      {
        id: "blackhole_x",
        type: "blackhole",
        name: "Singularity Sigma",
        x: 510,
        y: 330,
        radius: 50,
        eventHorizonRadius: 32,
        mass: 75,
        color: "#020617",
        glowColor: "rgba(251, 146, 60, 0.7)", // Accretion disk glow
      },
      {
        id: "planet_moon",
        type: "planet",
        name: "Lumen Minor",
        x: 740,
        y: 220,
        radius: 36,
        mass: 30,
        color: "#06b6d4",
        glowColor: "rgba(6, 182, 212, 0.4)",
      },
    ],
    relics: [
      { id: "r1", x: 510, y: 220, radius: 10, collected: false, angle: 0 },
      { id: "r2", x: 510, y: 440, radius: 10, collected: false, angle: 0 },
      { id: "r3", x: 740, y: 130, radius: 10, collected: false, angle: 0 },
    ],
    parTime: 20,
    threeStarFuel: 70,
  },

  // ── SECTOR 3: SPACETIME HORIZON ──────────────────────────────────────────
  {
    id: "sec3_lvl6",
    sector: 3,
    title: "EINSTEIN-ROSEN JUMP",
    subtitle: "Wormhole Spacetime Teleportation",
    briefing: "Direct flight paths are blocked by an impenetrable asteroid field. Guide the probe into Wormhole Alpha to emerge from Wormhole Beta on the other side.",
    companion: "kai",
    startPos: { x: 160, y: 350 },
    initialFuel: 150,
    target: { x: 860, y: 350, radius: 28, captureRadius: 44, pulse: 0 },
    bodies: [
      {
        id: "wormhole_in",
        type: "wormhole",
        name: "Wormhole Alpha",
        x: 360,
        y: 350,
        radius: 30,
        mass: 15,
        color: "#3b82f6",
        glowColor: "rgba(59, 130, 246, 0.7)",
        exitWormholeId: "wormhole_out",
      },
      {
        id: "wormhole_out",
        type: "wormhole",
        name: "Wormhole Beta",
        x: 660,
        y: 220,
        radius: 30,
        mass: 15,
        color: "#ec4899",
        glowColor: "rgba(236, 72, 153, 0.7)",
      },
      {
        id: "nebula_veil",
        type: "nebula",
        name: "Veil Nebula",
        x: 740,
        y: 420,
        radius: 80,
        mass: 0,
        dragCoefficient: 0.6,
        color: "rgba(99, 102, 241, 0.15)",
        glowColor: "rgba(99, 102, 241, 0.25)",
      },
    ],
    relics: [
      { id: "r1", x: 260, y: 350, radius: 10, collected: false, angle: 0 },
      { id: "r2", x: 740, y: 220, radius: 10, collected: false, angle: 0 },
      { id: "r3", x: 740, y: 420, radius: 10, collected: false, angle: 0 },
    ],
    parTime: 22,
    threeStarFuel: 80,
  },
  {
    id: "sec3_lvl7",
    sector: 3,
    title: "THE PALE STAR",
    subtitle: "Grand Celestial Orbital Confluence",
    briefing: "At the galactic core sits The Pale Star — a hyper-radiant white dwarf surrounded by twin planetary rings and a counter-gravitational pulsar. The ultimate orbital maneuver.",
    companion: "mochi",
    startPos: { x: 150, y: 520 },
    initialFuel: 180,
    target: { x: 880, y: 160, radius: 30, captureRadius: 48, pulse: 0 },
    bodies: [
      {
        id: "pale_star_core",
        type: "gas_giant",
        name: "The Pale Star",
        x: 520,
        y: 340,
        radius: 65,
        mass: 80,
        color: "#f8fafc",
        glowColor: "rgba(248, 250, 252, 0.75)",
        rings: true,
      },
      {
        id: "pulsar_guard",
        type: "pulsar",
        name: "Pulsar Aegis",
        x: 350,
        y: 260,
        radius: 34,
        mass: -38,
        color: "#06b6d4",
        glowColor: "rgba(6, 182, 212, 0.6)",
      },
      {
        id: "planet_zenith",
        type: "planet",
        name: "Zenith-Prime",
        x: 690,
        y: 460,
        radius: 44,
        mass: 38,
        color: "#a855f7",
        glowColor: "rgba(168, 85, 247, 0.5)",
      },
    ],
    relics: [
      { id: "r1", x: 400, y: 450, radius: 10, collected: false, angle: 0 },
      { id: "r2", x: 520, y: 190, radius: 10, collected: false, angle: 0 },
      { id: "r3", x: 690, y: 340, radius: 10, collected: false, angle: 0 },
    ],
    parTime: 25,
    threeStarFuel: 90,
  },
];

/**
 * Procedural Sector Generator
 * Generates an infinite variety of deterministic orbital layouts using a seed.
 */
export function generateProceduralLevel(seedNumber: number): LevelData {
  const pseudoRandom = (offset: number) => {
    const x = Math.sin(seedNumber * 997 + offset * 1337) * 10000;
    return x - Math.floor(x);
  };

  const companions: ("koji" | "mochi" | "kai")[] = ["koji", "mochi", "kai"];
  const comp = companions[Math.floor(pseudoRandom(1) * companions.length)];

  const startY = 220 + pseudoRandom(2) * 260;
  const targetY = 200 + pseudoRandom(3) * 300;

  const bodies: CelestialBody[] = [];
  const numBodies = 2 + Math.floor(pseudoRandom(4) * 3); // 2 to 4 bodies

  for (let i = 0; i < numBodies; i++) {
    const bx = 340 + i * 160 + pseudoRandom(10 + i) * 60;
    const by = 180 + pseudoRandom(20 + i) * 320;
    const isPulsar = pseudoRandom(30 + i) > 0.75;
    const isBlackHole = !isPulsar && pseudoRandom(40 + i) > 0.8;

    if (isPulsar) {
      bodies.push({
        id: `proc_pulsar_${i}`,
        type: "pulsar",
        name: `Pulsar ${String.fromCharCode(65 + i)}-${Math.floor(pseudoRandom(50 + i) * 99)}`,
        x: bx,
        y: by,
        radius: 32 + pseudoRandom(60 + i) * 8,
        mass: -(35 + pseudoRandom(70 + i) * 25),
        color: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.65)",
      });
    } else if (isBlackHole) {
      bodies.push({
        id: `proc_bh_${i}`,
        type: "blackhole",
        name: `Singularity ${String.fromCharCode(65 + i)}`,
        x: bx,
        y: by,
        radius: 46,
        eventHorizonRadius: 28,
        mass: 65 + pseudoRandom(80 + i) * 20,
        color: "#030712",
        glowColor: "rgba(249, 115, 22, 0.7)",
      });
    } else {
      const isGas = pseudoRandom(90 + i) > 0.5;
      bodies.push({
        id: `proc_planet_${i}`,
        type: isGas ? "gas_giant" : "planet",
        name: `Sector-${seedNumber} Core ${i + 1}`,
        x: bx,
        y: by,
        radius: 36 + pseudoRandom(100 + i) * 22,
        mass: 30 + pseudoRandom(110 + i) * 35,
        color: isGas ? "#8b5cf6" : "#0284c7",
        glowColor: isGas ? "rgba(139, 92, 246, 0.45)" : "rgba(2, 132, 199, 0.45)",
        rings: isGas,
      });
    }
  }

  // 3 Relics placed strategically around gravity wells
  const relics: Relic[] = [
    { id: "pr1", x: 380 + pseudoRandom(201) * 80, y: 160 + pseudoRandom(202) * 200, radius: 10, collected: false, angle: 0 },
    { id: "pr2", x: 520 + pseudoRandom(203) * 80, y: 220 + pseudoRandom(204) * 220, radius: 10, collected: false, angle: 0 },
    { id: "pr3", x: 680 + pseudoRandom(205) * 80, y: 180 + pseudoRandom(206) * 240, radius: 10, collected: false, angle: 0 },
  ];

  return {
    id: `proc_${seedNumber}`,
    sector: 99,
    title: `ANOMALY // SEED #${seedNumber}`,
    subtitle: "Procedural Gravity Well",
    briefing: "Deep space sensors detect an uncharted gravitational cluster. Navigate the randomized planetary matrix and recover all relics.",
    companion: comp,
    startPos: { x: 160, y: startY },
    initialFuel: 160,
    target: { x: 880, y: targetY, radius: 28, captureRadius: 46, pulse: 0 },
    bodies,
    relics,
    parTime: 22,
    threeStarFuel: 70,
  };
}
