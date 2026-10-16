import { useState, useEffect, useRef } from "react";
import { OrbitalEngine } from "./game/engine";
import { CAMPAIGN_LEVELS, generateProceduralLevel } from "./game/levels";
import type { LevelData, Probe, MissionResult } from "./game/types";
import { celestialSound } from "./game/sound";
import { 
  Rocket, RotateCcw, Volume2, VolumeX, Sparkles, 
  FastForward, Compass, CheckCircle2, AlertTriangle, 
  ChevronRight, Radio, Star, Shuffle
} from "lucide-react";

export default function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [isProcedural, setIsProcedural] = useState(false);
  const [procSeed, setProcSeed] = useState(42);
  const [currentLevel, setCurrentLevel] = useState<LevelData>(CAMPAIGN_LEVELS[0]);

  // Live Telemetry
  const [speedKmh, setSpeedKmh] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [maxFuel, setMaxFuel] = useState(100);
  const [relicsCount, setRelicsCount] = useState(0);
  const [totalRelics, setTotalRelics] = useState(1);
  const [probeState, setProbeState] = useState<Probe["state"]>("docked");
  const [timeWarp, setTimeWarpState] = useState(1);
  const [isMuted, setIsMuted] = useState(celestialSound.isMuted);
  const [volume, setVolumeState] = useState(celestialSound.volume);

  // Modals & Dialogue
  const [victoryModal, setVictoryModal] = useState<MissionResult | null>(null);
  const [failModal, setFailModal] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OrbitalEngine | null>(null);

  // Initialize Canvas & Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 1024;
    canvas.height = 680;

    const engine = new OrbitalEngine(canvas, currentLevel);

    engine.onStateUpdate = (probe, spd, rCount, rTotal) => {
      setSpeedKmh(spd);
      setFuel(probe.fuel);
      setMaxFuel(probe.maxFuel);
      setRelicsCount(rCount);
      setTotalRelics(rTotal);
      setProbeState(probe.state);
    };

    engine.onMissionVictory = (result) => {
      setVictoryModal(result);
    };

    engine.onMissionFailed = (reason) => {
      setFailModal(reason);
    };

    engineRef.current = engine;
    engine.start();

    // Browser audio unlock listener
    const handleFirstInteraction = () => {
      celestialSound.startBgm();
      window.removeEventListener("pointerdown", handleFirstInteraction);
    };
    window.addEventListener("pointerdown", handleFirstInteraction);

    return () => {
      engine.stop();
      window.removeEventListener("pointerdown", handleFirstInteraction);
    };
  }, []);

  // Level Switcher
  const loadLevel = (level: LevelData) => {
    setCurrentLevel(level);
    setShowBriefing(true);
    setVictoryModal(null);
    setFailModal(null);
    if (engineRef.current) {
      engineRef.current.setLevel(level);
    }
  };

  const handleNextLevel = () => {
    if (isProcedural) {
      const nextSeed = procSeed + 1;
      setProcSeed(nextSeed);
      loadLevel(generateProceduralLevel(nextSeed));
    } else {
      const nextIdx = (levelIndex + 1) % CAMPAIGN_LEVELS.length;
      setLevelIndex(nextIdx);
      loadLevel(CAMPAIGN_LEVELS[nextIdx]);
    }
  };

  const handleProceduralToggle = () => {
    if (!isProcedural) {
      setIsProcedural(true);
      loadLevel(generateProceduralLevel(procSeed));
    } else {
      setIsProcedural(false);
      loadLevel(CAMPAIGN_LEVELS[levelIndex]);
    }
  };

  const handleResetFlight = () => {
    setFailModal(null);
    setVictoryModal(null);
    if (engineRef.current) {
      engineRef.current.resetProbe();
    }
  };

  const handleTimeWarp = (warp: number) => {
    setTimeWarpState(warp);
    if (engineRef.current) {
      engineRef.current.setTimeWarp(warp);
    }
  };

  const toggleSound = () => {
    const muted = celestialSound.toggleMute();
    setIsMuted(muted);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolumeState(newVol);
    celestialSound.setVolume(newVol);
    if (isMuted && newVol > 0) {
      celestialSound.toggleMute();
      setIsMuted(false);
    }
  };

  const fuelPercent = Math.round((fuel / maxFuel) * 100);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none flex flex-col items-center justify-center">
      {/* ── Top Navigation & Mission Header ──────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Compass className="w-5 h-5 animate-spin [animation-duration:12s]" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">ORBIT DRIFT // RELATIVISTIC ENGINE</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-white font-extrabold text-sm">{currentLevel.title}</span>
            <span className="text-xs font-mono text-slate-400">· {currentLevel.subtitle}</span>
          </div>
        </div>

        {/* Level & Mode Selectors */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleProceduralToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all ${
              isProcedural 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 font-bold" 
                : "glass-btn text-slate-300 hover:text-white"
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>{isProcedural ? `Seed #${procSeed}` : "Procedural Mode"}</span>
          </button>

          {!isProcedural && (
            <select
              value={levelIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setLevelIndex(idx);
                loadLevel(CAMPAIGN_LEVELS[idx]);
              }}
              className="glass-panel px-3 py-1.5 text-xs font-mono text-white bg-slate-900 border border-white/15 rounded-xl outline-none cursor-pointer"
            >
              {CAMPAIGN_LEVELS.map((lvl, idx) => (
                <option key={lvl.id} value={idx}>
                  Sector {lvl.sector}: {lvl.title}
                </option>
              ))}
            </select>
          )}

          {/* Audio Indicator */}
          {!isMuted && volume > 0 && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-indigo-500/30 rounded-full text-xs font-mono text-indigo-300">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-indigo-400 rounded-full animate-pulse h-full" />
                <span className="w-0.5 bg-indigo-400 rounded-full animate-bounce h-2/3" />
                <span className="w-0.5 bg-indigo-400 rounded-full animate-pulse h-4/5" />
              </div>
              <span className="text-[11px] font-semibold text-white">Orbiting the Pale Star</span>
              <span className="text-indigo-400/60">// 60 BPM</span>
            </div>
          )}

          {/* Volume Slider & Mute Control */}
          <div className="glass-panel px-3 py-1.5 flex items-center gap-2 rounded-xl">
            <button
              onClick={toggleSound}
              className="text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="volume-slider w-16 sm:w-20"
              title={`Master Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
            <span className="text-[10px] font-mono text-indigo-300 w-7 text-right">
              {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Canvas Stage ─────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-[1024px] aspect-[1024/680] flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-2xl border border-white/10 shadow-[0_0_60px_rgba(15,23,42,0.8)] cursor-crosshair"
        />

        {/* ── Real-Time HUD Overlay ───────────────────────────────────────────── */}
        <div className="absolute top-6 left-6 pointer-events-none flex flex-col gap-2.5">
          {/* Velocity & Status */}
          <div className="glass-panel px-4 py-2 flex items-center gap-3 text-xs font-mono text-white backdrop-blur-md">
            <Rocket className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-slate-400">VELOCITY: </span>
              <span className="font-extrabold text-sky-300">{speedKmh.toLocaleString()} km/s</span>
            </div>
          </div>

          {/* RCS Fuel Gauge */}
          <div className="glass-panel px-4 py-2 flex flex-col gap-1.5 text-xs font-mono text-white backdrop-blur-md w-44">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">RCS FUEL:</span>
              <span className={`font-bold ${fuelPercent > 30 ? "text-emerald-400" : "text-amber-400"}`}>
                {fuelPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  fuelPercent > 30 ? "bg-emerald-400" : "bg-amber-400"
                }`}
                style={{ width: `${fuelPercent}%` }}
              />
            </div>
          </div>

          {/* Relics Recovered */}
          <div className="glass-panel px-4 py-2 flex items-center gap-2 text-xs font-mono text-white backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">RELICS: </span>
            <span className="font-bold text-amber-300">
              {relicsCount} / {totalRelics}
            </span>
          </div>
        </div>

        {/* Time Warp Selector (Top-Right of Canvas) */}
        <div className="absolute top-6 right-6 flex items-center gap-1.5 glass-panel p-1.5 text-xs font-mono">
          <FastForward className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          {[1, 2, 4].map((warp) => (
            <button
              key={warp}
              onClick={() => handleTimeWarp(warp)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                timeWarp === warp
                  ? "bg-indigo-600 text-white font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {warp}x
            </button>
          ))}
        </div>

        {/* Slingshot Guidance Prompt */}
        {probeState === "docked" && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-pill px-5 py-2 text-xs font-mono text-indigo-300 border border-indigo-500/30 flex items-center gap-2 shadow-lg animate-pulse">
            <Radio className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>DRAG PROBE BACKWARD TO AIM & RELEASE SLINGSHOT</span>
          </div>
        )}

        {/* In-Flight RCS Touch Thrusters (Mobile / Mouse Friendly) */}
        {probeState === "flying" && (
          <div className="absolute bottom-6 right-6 flex flex-col items-center gap-1 glass-panel p-2">
            <div className="text-[10px] font-mono text-slate-400 mb-1">RCS THRUSTERS (WASD)</div>
            <button
              onClick={() => engineRef.current?.applyRcsImpulse("up")}
              className="glass-btn px-3 py-1 rounded text-xs font-mono text-white"
            >
              ▲
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => engineRef.current?.applyRcsImpulse("left")}
                className="glass-btn px-3 py-1 rounded text-xs font-mono text-white"
              >
                ◀
              </button>
              <button
                onClick={() => engineRef.current?.applyRcsImpulse("down")}
                className="glass-btn px-3 py-1 rounded text-xs font-mono text-white"
              >
                ▼
              </button>
              <button
                onClick={() => engineRef.current?.applyRcsImpulse("right")}
                className="glass-btn px-3 py-1 rounded text-xs font-mono text-white"
              >
                ▶
              </button>
            </div>
          </div>
        )}

        {/* Reset Flight Button */}
        <div className="absolute bottom-6 left-6">
          <button
            onClick={handleResetFlight}
            className="glass-btn px-4 py-2.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>RESET TRAJECTORY</span>
          </button>
        </div>

        {/* ── Tactical Companion Comms Window ─────────────────────────────────── */}
        {showBriefing && (
          <div className="absolute top-16 right-6 max-w-sm glass-panel p-4 border border-indigo-500/30 animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {currentLevel.companion === "koji" ? "🐼" : currentLevel.companion === "mochi" ? "🦫" : "🦊"}
                </span>
                <span className="text-xs font-mono font-bold uppercase text-indigo-300">
                  {currentLevel.companion} // TACTICAL COMMS
                </span>
              </div>
              <button
                onClick={() => setShowBriefing(false)}
                className="text-xs text-slate-400 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              "{currentLevel.briefing}"
            </p>
          </div>
        )}

        {/* ── Victory Clearance Modal ─────────────────────────────────────────── */}
        {victoryModal && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="glass-panel p-8 max-w-md w-full border border-emerald-500/40 text-center flex flex-col items-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>

              <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase">
                  MISSION ACCOMPLISHED
                </h2>
                <p className="text-xs font-mono text-emerald-400 mt-1">
                  Target beacon captured with stable relativistic velocity.
                </p>
              </div>

              {/* Star Rating Display */}
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-7 h-7 ${
                      s <= victoryModal.stars
                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                        : "text-slate-700"
                    }`}
                  />
                ))}
              </div>

              {/* Stats Table */}
              <div className="w-full bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Flight Duration:</span>
                  <span className="text-white font-bold">{victoryModal.timeTaken}s</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>RCS Fuel Remaining:</span>
                  <span className="text-emerald-400 font-bold">{victoryModal.fuelRemaining}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Starlight Relics:</span>
                  <span className="text-amber-400 font-bold">
                    {victoryModal.relicsCollected} / {victoryModal.totalRelics}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleResetFlight}
                  className="flex-1 glass-btn py-3 rounded-xl text-xs font-mono font-bold text-slate-300"
                >
                  REPLAY
                </button>
                <button
                  onClick={handleNextLevel}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                  <span>NEXT SECTOR</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Mission Failed Modal ────────────────────────────────────────────── */}
        {failModal && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="glass-panel p-8 max-w-md w-full border border-rose-500/40 text-center flex flex-col items-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/50">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-white uppercase">
                  TRAJECTORY COMPROMISED
                </h2>
                <p className="text-xs font-mono text-rose-300 mt-2">
                  {failModal}
                </p>
              </div>

              <button
                onClick={handleResetFlight}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
              >
                <RotateCcw className="w-4 h-4" />
                <span>REROUTE TRAJECTORY</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
