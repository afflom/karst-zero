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

export type KarstAnimationSubPhase =
  | 'AnticipationWindup'
  | 'ApexImpulseInFlight'
  | 'FollowThroughSettle';

export interface ArticulatedPoseSample {
  tDecile: number;
  progressPermille: number;
  easedPermille: number;
  subPhaseOrdinal: 0 | 1 | 2;
  subPhase: KarstAnimationSubPhase;
  parabolicLiftScaled: number;
  torsoLeanScaled: number;
  muzzleFlashPermille: number;
  shockwavePermille: number;
  cameraShakePx: number;
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
  unitId?: string;
  targetUnitId?: string;
  doctrine?: DoctrineRole;
  chassis?: ChassisType;
  frequency?: ResonanceFrequency;
  calloutText?: string;
  isCritical?: boolean;
  isBacklash?: boolean;
  damageDealt?: number;
  berthSlot?: number;
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
 * Classify a decile (`0..10`) into its 3-phase animation sub-phase ordinal (`0, 1, 2`)
 * (`AnimationEngine::classifySubPhaseOrdinal`, `KZ-17`).
 */
export function classifySubPhaseOrdinal(tDecile: number): 0 | 1 | 2 {
  const clamped = clampAnimationDecile(tDecile);
  if (clamped <= 2) return 0;
  if (clamped <= 6) return 1;
  return 2;
}

/**
 * Map a sub-phase ordinal (`0, 1, 2`) to its canonical name (`KZ-17`).
 */
export function classifySubPhaseName(tDecile: number): KarstAnimationSubPhase {
  const ord = classifySubPhaseOrdinal(tDecile);
  if (ord === 0) return 'AnticipationWindup';
  if (ord === 1) return 'ApexImpulseInFlight';
  return 'FollowThroughSettle';
}

/**
 * Evaluate scaled forward torso / chassis pitch angle at decile `tDecile ∈ 0..10`
 * (`AnimationEngine::evaluateTorsoLeanScaled`, `KZ-17`).
 */
export function evaluateTorsoLeanScaled(strideBobPermille: number, tDecile: number): number {
  const clamped = clampAnimationDecile(tDecile);
  const bob = Math.max(0, Math.trunc(strideBobPermille));
  if (clamped <= 5) return bob * clamped;
  return bob * (10 - clamped);
}

/**
 * Evaluate weapon muzzle flash / energy discharge intensity in permille (`0..1000`)
 * (`AnimationEngine::evaluateMuzzleFlashPermille`, `KZ-17`).
 */
export function evaluateMuzzleFlashPermille(tDecile: number): number {
  const clamped = clampAnimationDecile(tDecile);
  if (clamped === 2) return 1000;
  if (clamped === 1 || clamped === 3) return 650;
  if (clamped === 4) return 250;
  return 0;
}

/**
 * Evaluate impact shockwave ring expansion in permille (`0..1000`)
 * (`AnimationEngine::evaluateShockwavePermille`, `KZ-17`).
 */
export function evaluateShockwavePermille(tDecile: number): number {
  const clamped = clampAnimationDecile(tDecile);
  if (clamped <= 4 || clamped >= 10) return 0;
  return (clamped - 4) * 200;
}

/**
 * Evaluate tactical viewport camera shake impulse in pixels
 * (`AnimationEngine::evaluateCameraShakePx`, `KZ-17`).
 */
export function evaluateCameraShakePx(shockwaveRadiusSectors: number, tDecile: number): number {
  const clamped = clampAnimationDecile(tDecile);
  const r = Math.max(0, Math.trunc(shockwaveRadiusSectors));
  if (clamped === 5 || clamped === 6) return r * 3;
  if (clamped === 7) return r;
  return 0;
}

/**
 * Evaluate the complete articulated pose, parabolic trajectory, and Doctrine VFX sample
 * at decile `tDecile ∈ 0..10` (`AnimationEngine::evaluateArticulatedPose`, `KZ-17`).
 */
export function evaluateArticulatedPose(params: {
  peakHeight: number;
  strideBobPermille: number;
  shockwaveRadiusSectors: number;
  tDecile: number;
  reducedMotion: boolean;
}): ArticulatedPoseSample {
  const { peakHeight, strideBobPermille, shockwaveRadiusSectors, tDecile, reducedMotion } = params;
  if (reducedMotion) {
    return {
      tDecile: 10,
      progressPermille: 1000,
      easedPermille: 1000,
      subPhaseOrdinal: 2,
      subPhase: 'FollowThroughSettle',
      parabolicLiftScaled: 0,
      torsoLeanScaled: 0,
      muzzleFlashPermille: 0,
      shockwavePermille: 0,
      cameraShakePx: 0,
      completed: true,
    };
  }
  const clamped = clampAnimationDecile(tDecile);
  const progressPermille = evaluateAnimationProgressPermille(clamped, false);
  const subPhaseOrdinal = classifySubPhaseOrdinal(clamped);
  return {
    tDecile: clamped,
    progressPermille,
    easedPermille: evaluateQuadOutPermille(clamped),
    subPhaseOrdinal,
    subPhase: classifySubPhaseName(clamped),
    parabolicLiftScaled: evaluateParabolicArcScaled(peakHeight, clamped),
    torsoLeanScaled: evaluateTorsoLeanScaled(strideBobPermille, clamped),
    muzzleFlashPermille: evaluateMuzzleFlashPermille(clamped),
    shockwavePermille: evaluateShockwavePermille(clamped),
    cameraShakePx: evaluateCameraShakePx(shockwaveRadiusSectors, clamped),
    completed: progressPermille >= 1000,
  };
}

/**
 * Detect whether the user's OS/browser requests WCAG 2.2 §2.3.3 reduced motion.
 */
export function detectReducedMotionPreference(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Continuous 60fps interpolation helper built on the verified `AnimationEngine` curves
 * for rendering smooth SVG motion paths, parabolic leaps, articulated poses, and projectile bolts.
 */
export function evaluateContinuousAnimationFrame(params: {
  elapsedMs: number;
  durationMs: number;
  peakHeight: number;
  strideBobPermille?: number;
  shockwaveRadiusSectors?: number;
  reducedMotion: boolean;
}): {
  rawProgress: number; // 0..1
  easedProgress: number; // 0..1 QuadOut
  parabolicZ: number; // 0..peakHeight
  tDecile: number; // 0..10 discrete decile witness
  discreteWitness: SpatialKeyframeSample;
  poseSample: ArticulatedPoseSample;
} {
  const {
    elapsedMs,
    durationMs,
    peakHeight,
    strideBobPermille = 120,
    shockwaveRadiusSectors = 1,
    reducedMotion,
  } = params;
  if (reducedMotion || durationMs <= 0 || elapsedMs >= durationMs) {
    return {
      rawProgress: 1,
      easedProgress: 1,
      parabolicZ: 0,
      tDecile: 10,
      discreteWitness: sampleSpatialKeyframe(peakHeight, 10, reducedMotion),
      poseSample: evaluateArticulatedPose({
        peakHeight,
        strideBobPermille,
        shockwaveRadiusSectors,
        tDecile: 10,
        reducedMotion,
      }),
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
    poseSample: evaluateArticulatedPose({
      peakHeight,
      strideBobPermille,
      shockwaveRadiusSectors,
      tDecile,
      reducedMotion: false,
    }),
  };
}

