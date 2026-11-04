/**
 * KARST: ZERO HORIZON — Web Audio API Synthesized Tactical Sound Engine
 */

class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, durationSec: number, type: OscillatorType = 'sine', gainPeak = 0.08, delaySec = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  public playChitDraw() {
    this.tone(520, 0.08, 'triangle', 0.07, 0);
    this.tone(780, 0.11, 'sine', 0.06, 0.05);
  }

  public playMoveStep() {
    this.tone(240, 0.06, 'sine', 0.05, 0);
    this.tone(320, 0.05, 'triangle', 0.04, 0.04);
  }

  public playSurgeSpend() {
    this.tone(440, 0.09, 'sine', 0.07, 0);
    this.tone(660, 0.12, 'triangle', 0.07, 0.05);
    this.tone(880, 0.14, 'sine', 0.06, 0.1);
  }

  public playStrikeRoll() {
    this.tone(310, 0.05, 'square', 0.04, 0);
    this.tone(415, 0.05, 'square', 0.04, 0.04);
    this.tone(520, 0.07, 'triangle', 0.05, 0.08);
  }

  public playMeleeImpact() {
    this.tone(110, 0.16, 'sawtooth', 0.1, 0);
    this.tone(75, 0.2, 'triangle', 0.09, 0.04);
  }

  public playLaserFire() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playResonanceCast() {
    this.tone(392, 0.15, 'sine', 0.07, 0);
    this.tone(587.33, 0.18, 'triangle', 0.07, 0.06);
    this.tone(783.99, 0.22, 'sine', 0.06, 0.12);
  }

  public playObjectiveClaim() {
    this.tone(523.25, 0.1, 'triangle', 0.08, 0);
    this.tone(659.25, 0.12, 'triangle', 0.08, 0.08);
    this.tone(1046.5, 0.2, 'sine', 0.08, 0.16);
  }

  public playVictoryFanfare() {
    this.tone(440, 0.14, 'triangle', 0.08, 0);
    this.tone(554.37, 0.14, 'triangle', 0.08, 0.12);
    this.tone(659.25, 0.16, 'triangle', 0.08, 0.24);
    this.tone(880, 0.32, 'sine', 0.09, 0.36);
  }
}

export const soundFX = new TacticalSoundEngine();
