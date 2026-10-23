/**
 * Web Audio DSP Synthesizer & Celestial BGM Manager for Orbital Gravity
 */
export class CelestialAudio {
  private ctx: AudioContext | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  public isMuted: boolean = false;
  public volume: number = 0.7; // 0.0 to 1.0

  constructor() {
    this.isMuted = localStorage.getItem("og_muted") === "true";
    const savedVol = localStorage.getItem("og_volume");
    if (savedVol !== null) {
      const parsed = parseFloat(savedVol);
      if (!isNaN(parsed)) {
        this.volume = Math.max(0, Math.min(1, parsed));
      }
    }
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    localStorage.setItem("og_volume", this.volume.toString());

    if (this.bgmAudio && !this.isMuted) {
      this.bgmAudio.volume = 0.45 * this.volume;
    }
  }

  startBgm() {
    if (this.isMuted || this.volume <= 0) return;
    if (!this.bgmAudio) {
      this.bgmAudio = new Audio("/audio/bgm.mp3");
      this.bgmAudio.loop = true;
      this.bgmAudio.volume = 0.45 * this.volume;
    } else {
      this.bgmAudio.volume = 0.45 * this.volume;
    }
    this.bgmAudio.play().catch(() => {
      // Browser autoplay policy guard
    });
  }

  // Slingshot Aim Tension Hum (frequency scales with pull distance)
  playTension(powerNormalized: number) {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    const freq = 120 + powerNormalized * 280; // 120Hz to 400Hz
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.04 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Probe Launch Swoosh
  playLaunch() {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(650, now + 0.25);

    gain.gain.setValueAtTime(0.2 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  // Relic Starlight Crystal Pickup Chime
  playRelic() {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.12 * this.volume, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.32);
    });
  }

  // RCS Thruster Burst
  playThruster() {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.08);

    gain.gain.setValueAtTime(0.08 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  // Wormhole Spacetime Jump
  playWormhole() {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    gain.gain.setValueAtTime(0.18 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.43);
  }

  // Victory / Destination Capture Fanfare
  playVictory() {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const chords = [392.0, 493.88, 587.33, 783.99, 987.77]; // G major celestial chime
    const now = this.ctx.currentTime;

    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.15 * this.volume, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.55);
    });
  }

  // Impact / Crash
  playCrash() {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);

    gain.gain.setValueAtTime(0.25 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Atmospheric Aerobraking re-entry friction burn
  playAerobrake() {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(260 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, now);

    gain.gain.setValueAtTime(0.08 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  // Hyperdrive Relativistic Warp Jump
  playWarpJump() {
    if (this.isMuted || this.volume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.4);

    gain.gain.setValueAtTime(0.22 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem("og_muted", this.isMuted.toString());
    if (this.isMuted) {
      if (this.bgmAudio) this.bgmAudio.pause();
    } else {
      if (this.bgmAudio) {
        this.bgmAudio.volume = 0.45 * this.volume;
      }
      this.startBgm();
    }
    return this.isMuted;
  }
}

export const celestialSound = new CelestialAudio();
