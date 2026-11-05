//! Nemesis Core 4.0 Deterministic Animation & Kinetic Choreography Engine
//! (`AnimationEngine.lex.tex`, `KZ-17`).
//!
//! Realizes the 8 canonical animation clips, 5 Chassis kinetic gaits, 6 Doctrine weapon
//! VFX profiles, fixed-point decile/permille easing curves, parabolic 2.5D trajectory arcs,
//! and WCAG 2.2 §2.3.3 reduced-motion terminal-frame collapse.

use crate::synthesis::{ChassisType, CombatDoctrine};

/// Canonical Nemesis Core 4.0 Animation Clip (`AnimationEngine::AnimationClipSpec`, `KZ-17`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum AnimationClipKind {
    /// `CLIP-01-IDLE-BREATH`: Ambient chassis breathing & reactor thrum (`2400` ms, `60` frames, looping).
    IdleResonancePulse = 0,
    /// `CLIP-02-STRIDE-STEP`: 2.5D parabolic sector-to-sector stride hop (`420` ms, `24` frames).
    SectorStrideTranslation = 1,
    /// `CLIP-03-MOMENTUM-CHARGE`: 4+-sector straight-line shockwave dash (`540` ms, `32` frames).
    MomentumChargeDash = 2,
    /// `CLIP-04-RANGED-TRACER`: High-velocity ballistic / plasma / rail tracer beam (`380` ms, `22` frames).
    BallisticStrikeTracer = 3,
    /// `CLIP-05-MELEE-CLEAVE`: Close-combat kinetic blade cleave & impact ring (`360` ms, `20` frames).
    MeleeCleaveArc = 4,
    /// `CLIP-06-RESONANCE-WAVE`: Concentric 6-frequency harmonic rings & neural tether (`680` ms, `40` frames).
    ResonanceHarmonicWave = 5,
    /// `CLIP-07-CHIT-DRAW`: Opaque Command Chit flip & `1d6` Warden Berth beacon pulse (`450` ms, `26` frames).
    CommandChitFlip = 6,
    /// `CLIP-08-ORBITAL-DROP`: Valkyrie-04 drop-pod atmospheric insertion & seismic ring (`900` ms, `54` frames).
    OrbitalPodInsertion = 7,
}

/// Deterministic Animation Easing Curve (`AnimationEngine::AnimationClipSpec.easingCurve`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum EasingCurve {
    /// Constant velocity (`f(t) = t`).
    Linear = 0,
    /// Decelerating quadratic ease-out (`f(t) = 1000 - 10 * (10 - t_decile)^2`).
    QuadOut = 1,
    /// Fast initial burst with smooth settle (`ExpoOut` / `QuartOut`).
    ExpoOut = 2,
    /// Smooth symmetric oscillation (`SineInOut` / `CubicInOut`).
    SmoothInOut = 3,
    /// Slight overshoot and settle (`BackOut`).
    BackOut = 4,
}

/// Metadata for a canonical animation clip (`AnimationEngine::animationClips`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct AnimationClipMetadata {
    /// Clip identifier enum.
    pub kind: AnimationClipKind,
    /// Duration in milliseconds (`durationMs`).
    pub duration_ms: u16,
    /// Discrete frame count (`frameCount`).
    pub frame_count: u8,
    /// Easing curve profile.
    pub easing: EasingCurve,
    /// Whether the clip loops continuously.
    pub looping: bool,
}

/// Chassis-specific kinetic gait profile (`AnimationEngine::ChassisGaitSpec`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ChassisGaitProfile {
    /// Chassis nature.
    pub chassis: ChassisType,
    /// Vertical bob amplitude in permille of tile height (`strideBobPermille`).
    pub stride_bob_permille: u16,
    /// Idle breathing cycle period in milliseconds (`idleCycleMs`).
    pub idle_cycle_ms: u16,
    /// Whether thruster/levitation wake particles are emitted (`thrusterTrailActive`).
    pub thruster_trail_active: bool,
}

/// Doctrine-specific weapon and strike VFX profile (`AnimationEngine::DoctrineVfxSpec`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DoctrineVfxProfile {
    /// Combat Doctrine role.
    pub doctrine: CombatDoctrine,
    /// Projectile / beam speed in permille (`projectileSpeedPermille`).
    pub projectile_speed_permille: u16,
    /// Impact shockwave radius in sectors (`shockwaveRadiusSectors`).
    pub shockwave_radius_sectors: u8,
}

/// Sampled 2.5D keyframe state produced by the deterministic animation evaluator (`KZ-17`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SpatialKeyframeSample {
    /// Normalized progress in permille (`0..=1000`).
    pub progress_permille: u16,
    /// Eased interpolation weight in permille (`0..=1000`).
    pub eased_permille: u16,
    /// Scaled parabolic vertical arc offset (`evaluateParabolicArcScaled`).
    pub parabolic_arc_scaled: u32,
    /// Whether the animation has reached its terminal state (`progress_permille == 1000`).
    pub completed: bool,
}

/// Total number of canonical animation clips in `AnimationEngine::animationClips` (`8`).
pub const ANIMATION_CLIP_COUNT: u8 = 8;

/// Clamp a decile value into `0..=10` (`AnimationEngine::clampDecile`, `KZ-17`).
#[must_use]
pub const fn clamp_decile(t_decile: u32) -> u32 {
    if t_decile >= 10 {
        10
    } else {
        t_decile
    }
}

/// Evaluate the quadratic ease-out curve in permille (`0..=1000`) at decile `t_decile` (`0..=10`)
/// (`AnimationEngine::evaluateQuadOutPermille`, `KZ-17`).
#[must_use]
pub const fn evaluate_quad_out_permille(t_decile: u32) -> u16 {
    let clamped = clamp_decile(t_decile);
    let inv = 10u32.saturating_sub(clamped);
    let penalty = 10u32.saturating_mul(inv.saturating_mul(inv));
    1000u32.saturating_sub(penalty) as u16
}

/// Evaluate the scaled parabolic vertical arc height at decile `t_decile` (`0..=10`)
/// (`AnimationEngine::evaluateParabolicArcScaled`, `KZ-17`).
#[must_use]
pub const fn evaluate_parabolic_arc_scaled(peak_height: u32, t_decile: u32) -> u32 {
    let clamped = clamp_decile(t_decile);
    let rem = 10u32.saturating_sub(clamped);
    peak_height.saturating_mul(clamped.saturating_mul(rem))
}

/// Evaluate normalized animation progress in permille (`0..=1000`), collapsing immediately to
/// `1000` when WCAG 2.2 §2.3.3 `reduced_motion` is active (`AnimationEngine::evaluateAnimationProgressPermille`, `KZ-17`).
#[must_use]
pub const fn evaluate_animation_progress_permille(t_decile: u32, reduced_motion: bool) -> u16 {
    if reduced_motion {
        1000
    } else {
        (clamp_decile(t_decile) * 100) as u16
    }
}

/// Sample a full 2.5D spatial keyframe at decile `t_decile` (`0..=10`) (`KZ-17`).
#[must_use]
pub const fn sample_spatial_keyframe(
    peak_height: u32,
    t_decile: u32,
    reduced_motion: bool,
) -> SpatialKeyframeSample {
    let effective_decile = if reduced_motion {
        10
    } else {
        clamp_decile(t_decile)
    };
    let progress_permille = evaluate_animation_progress_permille(effective_decile, reduced_motion);
    let eased_permille = evaluate_quad_out_permille(effective_decile);
    let parabolic_arc_scaled = evaluate_parabolic_arc_scaled(peak_height, effective_decile);
    SpatialKeyframeSample {
        progress_permille,
        eased_permille,
        parabolic_arc_scaled,
        completed: progress_permille >= 1000,
    }
}

/// Retrieve canonical metadata for any of the 8 Nemesis Core 4.0 animation clips (`AnimationEngine::animationClips`).
#[must_use]
pub const fn animation_clip_metadata(kind: AnimationClipKind) -> AnimationClipMetadata {
    match kind {
        AnimationClipKind::IdleResonancePulse => AnimationClipMetadata {
            kind,
            duration_ms: 2400,
            frame_count: 60,
            easing: EasingCurve::SmoothInOut,
            looping: true,
        },
        AnimationClipKind::SectorStrideTranslation => AnimationClipMetadata {
            kind,
            duration_ms: 420,
            frame_count: 24,
            easing: EasingCurve::QuadOut,
            looping: false,
        },
        AnimationClipKind::MomentumChargeDash => AnimationClipMetadata {
            kind,
            duration_ms: 540,
            frame_count: 32,
            easing: EasingCurve::ExpoOut,
            looping: false,
        },
        AnimationClipKind::BallisticStrikeTracer => AnimationClipMetadata {
            kind,
            duration_ms: 380,
            frame_count: 22,
            easing: EasingCurve::Linear,
            looping: false,
        },
        AnimationClipKind::MeleeCleaveArc => AnimationClipMetadata {
            kind,
            duration_ms: 360,
            frame_count: 20,
            easing: EasingCurve::BackOut,
            looping: false,
        },
        AnimationClipKind::ResonanceHarmonicWave => AnimationClipMetadata {
            kind,
            duration_ms: 680,
            frame_count: 40,
            easing: EasingCurve::SmoothInOut,
            looping: false,
        },
        AnimationClipKind::CommandChitFlip => AnimationClipMetadata {
            kind,
            duration_ms: 450,
            frame_count: 26,
            easing: EasingCurve::QuadOut,
            looping: false,
        },
        AnimationClipKind::OrbitalPodInsertion => AnimationClipMetadata {
            kind,
            duration_ms: 900,
            frame_count: 54,
            easing: EasingCurve::ExpoOut,
            looping: false,
        },
    }
}

/// Retrieve the kinetic gait profile for a Chassis (`AnimationEngine::chassisGaits`, `KZ-17`).
#[must_use]
pub const fn chassis_gait_profile(chassis: ChassisType) -> ChassisGaitProfile {
    match chassis {
        ChassisType::Spliced => ChassisGaitProfile {
            chassis,
            stride_bob_permille: 120,
            idle_cycle_ms: 2400,
            thruster_trail_active: false,
        },
        ChassisType::Automaton => ChassisGaitProfile {
            chassis,
            stride_bob_permille: 80,
            idle_cycle_ms: 2000,
            thruster_trail_active: false,
        },
        ChassisType::Xenomorph => ChassisGaitProfile {
            chassis,
            stride_bob_permille: 180,
            idle_cycle_ms: 1800,
            thruster_trail_active: false,
        },
        ChassisType::PhaseBorn => ChassisGaitProfile {
            chassis,
            stride_bob_permille: 60,
            idle_cycle_ms: 2800,
            thruster_trail_active: true,
        },
        ChassisType::RigWalker => ChassisGaitProfile {
            chassis,
            stride_bob_permille: 150,
            idle_cycle_ms: 2600,
            thruster_trail_active: true,
        },
    }
}

/// Retrieve the Doctrine weapon/strike VFX profile (`AnimationEngine::doctrineVfxProfiles`, `KZ-17`).
#[must_use]
pub const fn doctrine_vfx_profile(doctrine: CombatDoctrine) -> DoctrineVfxProfile {
    match doctrine {
        CombatDoctrine::Breacher => DoctrineVfxProfile {
            doctrine,
            projectile_speed_permille: 850,
            shockwave_radius_sectors: 2,
        },
        CombatDoctrine::Aegis => DoctrineVfxProfile {
            doctrine,
            projectile_speed_permille: 750,
            shockwave_radius_sectors: 1,
        },
        CombatDoctrine::Outrider => DoctrineVfxProfile {
            doctrine,
            projectile_speed_permille: 950,
            shockwave_radius_sectors: 1,
        },
        CombatDoctrine::Deadeye => DoctrineVfxProfile {
            doctrine,
            projectile_speed_permille: 1000,
            shockwave_radius_sectors: 1,
        },
        CombatDoctrine::Saboteur => DoctrineVfxProfile {
            doctrine,
            projectile_speed_permille: 800,
            shockwave_radius_sectors: 2,
        },
        CombatDoctrine::Psion => DoctrineVfxProfile {
            doctrine,
            projectile_speed_permille: 900,
            shockwave_radius_sectors: 3,
        },
    }
}
