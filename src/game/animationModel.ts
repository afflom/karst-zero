/**
 * NEMESIS CORE 4.0 — Deterministic Animation & Kinetic Choreography Engine
 * (`src/AnimationEngine.lex.tex`, `crates/karst-kernel/src/animation.rs`, `KZ-17`).
 *
 * Realizes the 8 canonical animation clips, 5 Chassis kinetic gaits, 6 Doctrine weapon
 * VFX profiles, fixed-point quadratic ease-out & parabolic arc evaluators, and WCAG 2.2 §2.3.3
 * reduced-motion terminal-frame transitions across the 2.5D Object-Spatial viewport.
 */

import type { ChassisType, DoctrineRole, ResonanceFrequency } from './types';

export type KarstAnimationClipId =
  | 'CLIP-01-IDLE-BREATH'
  | 'CLIP-02-STRIDE-STEP'
  | 'CLIP-03-MOMENTUM-CHARGE'
  | 'CLIP-04-RANGED-TRACER'
  | 'CLIP-05-MELEE-CLEAVE'
  | 'CLIP-06-RESONANCE-WAVE'
  | 'CLIP-07-CHIT-DRAW'
  | 'CLIP-08-ORBITAL-DROP';

export type KarstAnimationLayer =
  | 'Ambient'
  | 'Locomotion'
  | 'Combat'
  | 'Psionic'
  | 'Telemetry'
  | 'Orbital';

export type KarstEasingCurveName =
  | 'Linear'
  | 'QuadOut'
  | 'ExpoOut'
  | 'SineInOut'
  | 'CubicInOut'
  | 'BackOut'
  | 'QuartOut';

export interface AnimationClipSpec {
  id: KarstAnimationClipId;
  name: string;
  layer: KarstAnimationLayer;
  durationMs: number;
  frameCount: number;
  easingCurve: KarstEasingCurveName;
  looping: boolean;
  description: string;
}

export interface ChassisGaitSpec {
  chassisId: ChassisType;
  gaitStyle: string;
  strideBobPermille: number;
  idleCycleMs: number;
  thrusterTrailActive: boolean;
  summary: string;
}

export interface DoctrineVfxSpec {
  doctrineId: DoctrineRole;
  vfxKind: string;
  accentHex: string;
  secondaryHex: string;
  projectileSpeedPermille: number;
  shockwaveRadiusSectors: number;
  summary: string;
}

export interface SpatialKeyframeSample {
  tDecile: number;
  progressPermille: number;
  easedPermille: number;
  parabolicArcScaled: number;
  completed: boolean;
}

export interface ActiveBattlefieldAnimationEvent {
  id: string;
  clipId: KarstAnimationClipId;
  startedAtMs: number;
  durationMs: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  doctrine?: DoctrineRole;
  chassis?: ChassisType;
  frequency?: ResonanceFrequency;
  calloutText?: string;
  isCritical?: boolean;
  damageDealt?: number;
}

/**
 * 8 Canonical Nemesis Core 4.0 Animation Clips (`AnimationEngine::animationClips`, `KZ-17`).
 */
export const KARST_ANIMATION_CLIPS: AnimationClipSpec[] = [
  {
    id: 'CLIP-01-IDLE-BREATH',
    name: 'IdleResonancePulse',
    layer: 'Ambient',
    durationMs: 2400,
    frameCount: 60,
    easingCurve: 'SineInOut',
    looping: true,
    description:
      'Ambient chassis breathing oscillation, reactor core pulse, and pedestal aura shimmer.',
  },
  {
    id: 'CLIP-02-STRIDE-STEP',
    name: 'SectorStrideTranslation',
    layer: 'Locomotion',
    durationMs: 420,
    frameCount: 24,
    easingCurve: 'QuadOut',
    looping: false,
    description:
      '2.5D parabolic sector-to-sector tactical stride interpolation with footfall dust ring.',
  },
  {
    id: 'CLIP-03-MOMENTUM-CHARGE',
    name: 'MomentumChargeDash',
    layer: 'Locomotion',
    durationMs: 540,
    frameCount: 32,
    easingCurve: 'ExpoOut',
    looping: false,
    description:
      '4+-sector straight-line assault charge with thruster afterimages and kinetic impact shockwave.',
  },
  {
    id: 'CLIP-04-RANGED-TRACER',
    name: 'BallisticStrikeTracer',
    layer: 'Combat',
    durationMs: 380,
    frameCount: 22,
    easingCurve: 'Linear',
    looping: false,
    description:
      'Doctrine-tuned ballistic/plasma/rail tracer bolt along the 2.5D sightline with muzzle flash and shield sparks.',
  },
  {
    id: 'CLIP-05-MELEE-CLEAVE',
    name: 'MeleeCleaveArc',
    layer: 'Combat',
    durationMs: 360,
    frameCount: 20,
    easingCurve: 'BackOut',
    looping: false,
    description:
      'Close-quarters kinetic weapon cleave arc, armor-shatter burst, and target recoil impulse.',
  },
  {
    id: 'CLIP-06-RESONANCE-WAVE',
    name: 'ResonanceHarmonicWave',
    layer: 'Psionic',
    durationMs: 680,
    frameCount: 40,
    easingCurve: 'CubicInOut',
    looping: false,
    description:
      'Concentric 6-frequency Resonance Weave rings, harmonic phase tether, and Backlash discharge.',
  },
  {
    id: 'CLIP-07-CHIT-DRAW',
    name: 'CommandChitFlip',
    layer: 'Telemetry',
    durationMs: 450,
    frameCount: 26,
    easingCurve: 'QuadOut',
    looping: false,
    description:
      'Opaque Command Chit draw flip and 1d6 Warden Berth wrap-around selector beacon pulse.',
  },
  {
    id: 'CLIP-08-ORBITAL-DROP',
    name: 'OrbitalPodInsertion',
    layer: 'Orbital',
    durationMs: 900,
    frameCount: 54,
    easingCurve: 'QuartOut',
    looping: false,
    description:
      'Valkyrie-04 drop-pod atmospheric descent streak, retro-thruster flare, and landing dust ring.',
  },
];

/**
 * 5 Chassis Kinetic Gait Profiles (`AnimationEngine::chassisGaits`, `KZ-17`).
 */
export const KARST_CHASSIS_GAITS: Record<ChassisType, ChassisGaitSpec> = {
  Spliced: {
    chassisId: 'Spliced',
    gaitStyle: 'BipedalTacticalStride',
    strideBobPermille: 120,
    idleCycleMs: 2400,
    thrusterTrailActive: false,
    summary: 'Balanced bio-engineered bipedal stride with low-profile combat crouch.',
  },
  Automaton: {
    chassisId: 'Automaton',
    gaitStyle: 'HydraulicPistonMarch',
    strideBobPermille: 80,
    idleCycleMs: 2000,
    thrusterTrailActive: false,
    summary: 'Precision servo-locked piston cadence with stabilized weapon gimbal.',
  },
  Xenomorph: {
    chassisId: 'Xenomorph',
    gaitStyle: 'PredatoryBoundingLeap',
    strideBobPermille: 180,
    idleCycleMs: 1800,
    thrusterTrailActive: false,
    summary: 'High-arch predatory pounce with rapid metabolic respiration.',
  },
  PhaseBorn: {
    chassisId: 'PhaseBorn',
    gaitStyle: 'VoidLevitationGlide',
    strideBobPermille: 60,
    idleCycleMs: 2800,
    thrusterTrailActive: true,
    summary: 'Zero-friction phase levitation with shimmering void-wake particles.',
  },
  RigWalker: {
    chassisId: 'RigWalker',
    gaitStyle: 'HeavyMechSeismicStomp',
    strideBobPermille: 150,
    idleCycleMs: 2600,
    thrusterTrailActive: true,
    summary: 'Heavy armored walker stomp with twin dorsal exhaust plumes.',
  },
};

/**
 * 6 Doctrine Weapon & Strike VFX Profiles (`AnimationEngine::doctrineVfxProfiles`, `KZ-17`).
 */
export const KARST_DOCTRINE_VFX_PROFILES: Record<DoctrineRole, DoctrineVfxSpec> = {
  Breacher: {
    doctrineId: 'Breacher',
    vfxKind: 'KineticScatterShockwave',
    accentHex: '#FF7A1A',
    secondaryHex: '#FDE047',
    projectileSpeedPermille: 850,
    shockwaveRadiusSectors: 2,
    summary: 'Heavy amber scatter-cone blast and 2-sector kinetic ram shockwave.',
  },
  Aegis: {
    doctrineId: 'Aegis',
    vfxKind: 'HexagonalDeflectorDome',
    accentHex: '#38BDF8',
    secondaryHex: '#BAE6FD',
    projectileSpeedPermille: 750,
    shockwaveRadiusSectors: 1,
    summary: 'Interlocking cyan phalanx barrier dome and suppression counter-bolt.',
  },
  Outrider: {
    doctrineId: 'Outrider',
    vfxKind: 'ThrusterAfterimageTracer',
    accentHex: '#34D399',
    secondaryHex: '#A7F3D0',
    projectileSpeedPermille: 950,
    shockwaveRadiusSectors: 1,
    summary: 'Emerald twin-carbine rapid burst and high-speed thruster afterimages.',
  },
  Deadeye: {
    doctrineId: 'Deadeye',
    vfxKind: 'HyperVelocityRailLance',
    accentHex: '#FBBF24',
    secondaryHex: '#FEF08A',
    projectileSpeedPermille: 1000,
    shockwaveRadiusSectors: 1,
    summary: 'Piercing gold rail-lance beam with concentric target-lock reticle.',
  },
  Saboteur: {
    doctrineId: 'Saboteur',
    vfxKind: 'DemolitionShatterBurst',
    accentHex: '#F43F5E',
    secondaryHex: '#FDA4AF',
    projectileSpeedPermille: 800,
    shockwaveRadiusSectors: 2,
    summary: 'Crimson arc-disruptor pulse and destructible cover shatter fragments.',
  },
  Psion: {
    doctrineId: 'Psion',
    vfxKind: 'ConcentricHarmonicWeave',
    accentHex: '#A855F7',
    secondaryHex: '#E9D5FF',
    projectileSpeedPermille: 900,
    shockwaveRadiusSectors: 3,
    summary: 'Violet harmonic resonance wave rings and phase-space neural tether.',
  },
};

/**
 * Clamp a decile value into `0..10` (`AnimationEngine::clampDecile`, `KZ-17`).
 */
export function clampAnimationDecile(tDecile: number): number {
  return Math.max(0, Math.min(10, Math.trunc(tDecile)));
}

/**
 * Evaluate the quadratic ease-out curve in permille (`0..1000`) at decile `tDecile ∈ 0..10`
 * (`AnimationEngine::evaluateQuadOutPermille`, `KZ-17`).
 */
export function evaluateQuadOutPermille(tDecile: number): number {
  const clamped = clampAnimationDecile(tDecile);
  const inv = 10 - clamped;
  return 1000 - 10 * inv * inv;
}

/**
 * Evaluate the scaled parabolic arc height at decile `tDecile ∈ 0..10`
 * (`AnimationEngine::evaluateParabolicArcScaled`, `KZ-17`).
 */
export function evaluateParabolicArcScaled(peakHeight: number, tDecile: number): number {
  const clamped = clampAnimationDecile(tDecile);
  return Math.trunc(peakHeight) * clamped * (10 - clamped);
}

/**
 * Evaluate normalized animation progress in permille (`0..1000`), collapsing immediately
 * to `1000` when WCAG 2.2 §2.3.3 `reducedMotion` is enabled
 * (`AnimationEngine::evaluateAnimationProgressPermille`, `KZ-17`).
 */
export function evaluateAnimationProgressPermille(
  tDecile: number,
  reducedMotion: boolean
): number {
  if (reducedMotion) return 1000;
  return clampAnimationDecile(tDecile) * 100;
}

/**
 * Sample a discrete 2.5D keyframe at decile `tDecile ∈ 0..10` (`KZ-17`).
 */
export function sampleSpatialKeyframe(
  peakHeight: number,
  tDecile: number,
  reducedMotion: boolean
): SpatialKeyframeSample {
  const effectiveDecile = reducedMotion ? 10 : clampAnimationDecile(tDecile);
  const progressPermille = evaluateAnimationProgressPermille(effectiveDecile, reducedMotion);
  const easedPermille = evaluateQuadOutPermille(effectiveDecile);
  const parabolicArcScaled = evaluateParabolicArcScaled(peakHeight, effectiveDecile);
  return {
    tDecile: effectiveDecile,
    progressPermille,
    easedPermille,
    parabolicArcScaled,
    completed: progressPermille >= 1000,
  };
}

/**
 * Continuous 60fps interpolation helper built on the verified `AnimationEngine` curves
 * for rendering smooth SVG motion paths, parabolic leaps, and projectile bolts.
 */
export function evaluateContinuousAnimationFrame(params: {
  elapsedMs: number;
  durationMs: number;
  peakHeight: number;
  reducedMotion: boolean;
}): {
  rawProgress: number; // 0..1
  easedProgress: number; // 0..1 QuadOut
  parabolicZ: number; // 0..peakHeight
  tDecile: number; // 0..10 discrete decile witness
  discreteWitness: SpatialKeyframeSample;
} {
  const { elapsedMs, durationMs, peakHeight, reducedMotion } = params;
  if (reducedMotion || durationMs <= 0 || elapsedMs >= durationMs) {
    return {
      rawProgress: 1,
      easedProgress: 1,
      parabolicZ: 0,
      tDecile: 10,
      discreteWitness: sampleSpatialKeyframe(peakHeight, 10, reducedMotion),
    };
  }
  const rawProgress = Math.max(0, Math.min(1, elapsedMs / durationMs));
  const inv = 1 - rawProgress;
  const easedProgress = 1 - inv * inv;
  const parabolicZ = 4 * peakHeight * rawProgress * (1 - rawProgress);
  const tDecile = clampAnimationDecile(Math.round(rawProgress * 10));
  return {
    rawProgress,
    easedProgress,
    parabolicZ,
    tDecile,
    discreteWitness: sampleSpatialKeyframe(peakHeight, tDecile, false),
  };
}
