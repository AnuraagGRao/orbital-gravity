import { useState, useEffect, useRef } from "react";
import { OrbitalEngine } from "./game/engine";
import { CAMPAIGN_LEVELS, generateProceduralLevel, generateOdysseySector } from "./game/levels";
import type { LevelData, Probe, MissionResult } from "./game/types";
import { celestialSound } from "./game/sound";
import { 
  Rocket, RotateCcw, Volume2, VolumeX, Sparkles, 
  FastForward, Compass, CheckCircle2, AlertTriangle, 
  ChevronRight, Radio, Star, Shuffle, Flame, Trophy, Zap
} from "lucide-react";

export default function App() {
  const [gameMode, setGameMode] = useState<"campaign" | "odyssey" | "procedural">("campaign");
  const [levelIndex, setLevelIndex] = useState(0);
  const [procSeed, setProcSeed] = useState(42);
  const [odysseySector, setOdysseySector] = useState(1);
  const [bestSector, setBestSector] = useState(() => {
    const saved = localStorage.getItem("og_best_sector");
    return saved ? parseInt(saved, 10) : 1;
  });
  const [warpBanner, setWarpBanner] = useState<string | null>(null);

  const [currentLevel, setCurrentLevel] = useState<LevelData>(CAMPAIGN_LEVELS[0]);

  // Live Telemetry
  const [speedKmh, setSpeedKmh] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [maxFuel, setMaxFuel] = useState(100);
  const [relicsCount, setRelicsCount] = useState(0);
  const [totalRelics, setTotalRelics] = useState(1);
  const [probeState, setProbeState] = useState<Probe["state"]>("docked");
  const [isAerobraking, setIsAerobraking] = useState(false);
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
      setIsAerobraking(!!probe.isAerobraking);
    };

    engine.onMissionVictory = (result) => {
      setVictoryModal(result);
    };

    engine.onMissionFailed = (reason) => {
      setFailModal(reason);
    };

    engine.onOdysseyWarp = (nextSec, fuelRemaining) => {
      setOdysseySector(nextSec);
      if (nextSec > bestSector) {
        setBestSector(nextSec);
        localStorage.setItem("og_best_sector", nextSec.toString());
      }
      setWarpBanner(`HYPERDRIVE ENGAGED // WARPING TO SECTOR ${nextSec} (+${fuelRemaining} FUEL CARRIED)`);
      setTimeout(() => {
        setWarpBanner(null);
      }, 2400);
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
    if (gameMode === "procedural") {
      const nextSeed = procSeed + 1;
      setProcSeed(nextSeed);
      loadLevel(generateProceduralLevel(nextSeed));
    } else if (gameMode === "odyssey") {
      const nextSec = odysseySector + 1;
      setOdysseySector(nextSec);
      loadLevel(generateOdysseySector(nextSec, 160));
    } else {
      const nextIdx = (levelIndex + 1) % CAMPAIGN_LEVELS.length;
      setLevelIndex(nextIdx);
      loadLevel(CAMPAIGN_LEVELS[nextIdx]);
    }
  };

  const handleModeSwitch = (newMode: "campaign" | "odyssey" | "procedural") => {
    setGameMode(newMode);
    if (newMode === "odyssey") {
      setOdysseySector(1);
      if (engineRef.current) {
        engineRef.current.isOdysseyMode = true;
        engineRef.current.odysseySector = 1;
      }
      loadLevel(generateOdysseySector(1, 160));
    } else if (newMode === "procedural") {
      if (engineRef.current) {
        engineRef.current.isOdysseyMode = false;
      }
      loadLevel(generateProceduralLevel(procSeed));
    } else {
      if (engineRef.current) {
        engineRef.current.isOdysseyMode = false;
      }
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

  const handleRestartOdyssey = () => {
    setFailModal(null);
    setVictoryModal(null);
    setOdysseySector(1);
    if (engineRef.current) {
      engineRef.current.odysseySector = 1;
      loadLevel(generateOdysseySector(1, 160));
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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none flex flex-col items-center justify-center touch-none">
      {/* ── Top Navigation & Mission Header ──────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 sm:px-6 sm:py-4 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2 text-indigo-400">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 animate-spin [animation-duration:12s]" />
            <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest uppercase">
              ORBIT DRIFT <span className="hidden sm:inline">// RELATIVISTIC ENGINE</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="text-white font-extrabold text-sm">{currentLevel.title}</span>
            <span className="text-xs font-mono text-slate-400">· {currentLevel.subtitle}</span>
          </div>
        </div>

        {/* Level & Mode Selectors */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Mode Switcher */}
          <div className="flex bg-slate-900 border border-white/10 rounded-xl p-0.5 sm:p-1 text-[10px] sm:text-xs font-mono">
            <button
              onClick={() => handleModeSwitch("campaign")}
              className={`px-2 py-1 rounded-lg transition-all ${
                gameMode === "campaign"
                  ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Campaign
            </button>
            <button
              onClick={() => handleModeSwitch("odyssey")}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                gameMode === "odyssey"
                  ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Odyssey</span>
            </button>
            <button
              onClick={() => handleModeSwitch("procedural")}
              className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${
                gameMode === "procedural"
                  ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shuffle className="w-3 h-3" />
              <span>Seed</span>
            </button>
          </div>

          {gameMode === "campaign" && (
            <select
              value={levelIndex}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setLevelIndex(idx);
                loadLevel(CAMPAIGN_LEVELS[idx]);
              }}
              className="glass-panel px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-mono text-white bg-slate-900 border border-white/15 rounded-xl outline-none cursor-pointer max-w-[120px] sm:max-w-none truncate"
            >
              {CAMPAIGN_LEVELS.map((lvl, idx) => (
                <option key={lvl.id} value={idx}>
                  S{lvl.sector}: {lvl.title}
                </option>
              ))}
            </select>
          )}

          {gameMode === "odyssey" && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/60 border border-purple-500/40 rounded-xl text-xs font-mono text-purple-300">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Sec {odysseySector}</span>
              <span className="text-purple-400/60">/ High {bestSector}</span>
            </div>
          )}

          {/* Audio Indicator */}
          {!isMuted && volume > 0 && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-indigo-500/30 rounded-full text-xs font-mono text-indigo-300">
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
          <div className="glass-panel px-2 py-1 sm:px-3 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 rounded-xl">
            <button
              onClick={toggleSound}
              className="text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="volume-slider w-12 sm:w-16"
              title={`Master Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
            <span className="text-[10px] font-mono text-indigo-300 w-6 sm:w-7 text-right hidden xs:inline">
              {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        </div>
      </header>

      {/* ── Warp Odyssey Hyperdrive Banner ───────────────────────────────────── */}
      {warpBanner && (
        <div className="absolute top-16 sm:top-20 z-50 flex justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-panel px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-2xl bg-indigo-950/90 border border-indigo-400/60 shadow-[0_0_40px_rgba(99,102,241,0.6)] flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-300 animate-bounce" />
            <span className="text-xs sm:text-sm font-mono font-black text-indigo-100 tracking-wider">
              {warpBanner}
            </span>
          </div>
        </div>
      )}

      {/* ── Main Canvas Stage ─────────────────────────────────────────────────── */}
      <div className="stage-viewport">
        <div className="stage-wrapper">
          <canvas
            ref={canvasRef}
            className="canvas-element"
          />

          {/* ── Top-Left HUD Overlay ───────────────────────────────────────────── */}
          <div className="hud-top-left">
            {/* Velocity & Status */}
            <div className="glass-panel px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-mono text-white backdrop-blur-md">
              <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
              <div>
                <span className="text-slate-400">VEL: </span>
                <span className="font-extrabold text-sky-300">{speedKmh.toLocaleString()} km/s</span>
              </div>
            </div>

            {/* Atmospheric Aerobraking Drag Alert */}
            {isAerobraking && (
              <div className="glass-panel px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 text-[11px] sm:text-xs font-mono text-amber-300 border border-amber-500/50 bg-amber-950/50 backdrop-blur-md animate-pulse">
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-bounce" />
                <span className="font-bold">AEROBRAKING DRAG</span>
              </div>
            )}

            {/* RCS Fuel Gauge */}
            <div className="glass-panel px-3 py-1.5 sm:px-4 sm:py-2 flex flex-col gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-mono text-white backdrop-blur-md w-36 sm:w-44">
              <div className="flex justify-between items-center text-[10px] sm:text-[11px]">
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

            {/* Relics Recovered (+25 Fuel Bonus Badge) */}
            <div className="glass-panel px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 text-[11px] sm:text-xs font-mono text-white backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="text-slate-400">RELICS: </span>
              <span className="font-bold text-amber-300">
                {relicsCount} / {totalRelics}
              </span>
              <span className="text-[10px] text-sky-400/80 font-mono ml-1">(+25 FUEL)</span>
            </div>

            {/* Ghost Trail Status */}
            {engineRef.current && engineRef.current.ghostTrail.length > 0 && probeState === "docked" && (
              <div className="glass-panel px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-mono text-slate-400 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-slate-400/60 animate-ping" />
                <span>GHOST TRAIL ASSIST ON</span>
              </div>
            )}
          </div>

          {/* Time Warp Selector (Top-Right of Canvas) */}
          <div className="hud-top-right glass-panel p-1 sm:p-1.5 text-[11px] sm:text-xs font-mono">
            <FastForward className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 ml-1 sm:ml-1.5" />
            {[1, 2, 4].map((warp) => (
              <button
                key={warp}
                onClick={() => handleTimeWarp(warp)}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition-all ${
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
            <div className="hud-bottom-center glass-pill px-3 py-1.5 sm:px-5 sm:py-2 text-[10px] sm:text-xs font-mono text-indigo-300 border border-indigo-500/30 flex items-center gap-2 shadow-lg animate-pulse whitespace-nowrap">
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 animate-spin shrink-0" />
              <span>DRAG BACKWARD TO AIM • PULL RIM FOR FULL FORCE</span>
            </div>
          )}

          {/* In-Flight RCS Touch Thrusters (Mobile / Mouse Friendly) */}
          {probeState === "flying" && (
            <div className="hud-bottom-right glass-panel p-1.5 sm:p-2">
              <div className="text-[9px] sm:text-[10px] font-mono text-slate-400 mb-0.5">RCS (WASD)</div>
              <button
                onClick={() => engineRef.current?.applyRcsImpulse("up")}
                className="glass-btn px-3 py-1.5 rounded text-xs font-mono text-white active:bg-indigo-600"
              >
                ▲
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => engineRef.current?.applyRcsImpulse("left")}
                  className="glass-btn px-3 py-1.5 rounded text-xs font-mono text-white active:bg-indigo-600"
                >
                  ◀
                </button>
                <button
                  onClick={() => engineRef.current?.applyRcsImpulse("down")}
                  className="glass-btn px-3 py-1.5 rounded text-xs font-mono text-white active:bg-indigo-600"
                >
                  ▼
                </button>
                <button
                  onClick={() => engineRef.current?.applyRcsImpulse("right")}
                  className="glass-btn px-3 py-1.5 rounded text-xs font-mono text-white active:bg-indigo-600"
                >
                  ▶
                </button>
              </div>
            </div>
          )}

          {/* Reset Flight Button */}
          <div className="hud-bottom-left">
            <button
              onClick={handleResetFlight}
              className="glass-btn px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 sm:gap-2 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
              <span>RESET FLIGHT</span>
            </button>
          </div>

          {/* ── Tactical Companion Comms Window ─────────────────────────────────── */}
          {showBriefing && (
            <div className="hud-comms glass-panel p-3.5 sm:p-4 border border-indigo-500/30 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right duration-300">
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
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                "{currentLevel.briefing}"
              </p>
            </div>
          )}

        {/* ── Victory Clearance Modal (Campaign & Procedural) ───────────────────── */}
        {victoryModal && gameMode !== "odyssey" && (
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
                    className={`w-8 h-8 transition-all ${
                      s <= victoryModal.stars
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-700"
                    }`}
                    fill={s <= victoryModal.stars ? "#fbbf24" : "none"}
                    color={s <= victoryModal.stars ? "#fbbf24" : "#334155"}
                    style={{
                      filter: s <= victoryModal.stars ? "drop-shadow(0 0 10px rgba(251, 191, 36, 0.75))" : "none"
                    }}
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
                  {gameMode === "odyssey" ? `ODYSSEY HALTED // SECTOR ${odysseySector}` : "TRAJECTORY COMPROMISED"}
                </h2>
                <p className="text-xs font-mono text-rose-300 mt-2">
                  {failModal}
                </p>
                {gameMode === "odyssey" && (
                  <p className="text-[11px] font-mono text-purple-300 mt-1">
                    Odyssey run reached Sector {odysseySector} (Record: Sector {bestSector})
                  </p>
                )}
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleResetFlight}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>RETRY SECTOR</span>
                </button>
                {gameMode === "odyssey" && (
                  <button
                    onClick={handleRestartOdyssey}
                    className="flex-1 glass-btn py-3 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white"
                  >
                    RESET RUN
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
