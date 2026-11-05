//! Nemesis Core 4.0 Opposed d6 Strike Pool, Terrain Cover, Automaton `1d6` Subsystem Rupture,
//! Fireteam Casualty Spillover (`CombatEngine.lex.tex`), and 6-Frequency Resonance Weave
//! (`ResonanceWeave.lex.tex`).

/// Terrain Cover state (`CombatEngine::CoverKind`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum CoverKind {
    /// Open ground (`0` auto-EVA bonus, Line of Sight clear).
    Open = 0,
    /// Low Barricade Partial Cover (`+1` automatic Evasion success, Line of Sight clear).
    LowBarricadePartial = 1,
    /// Solid Bulkhead Full Cover (blocks ranged Line of Sight completely).
    SolidBulkheadFull = 2,
}

/// Automaton `1d6` Subsystem Rupture outcome (`CombatEngine::SubsystemRuptureEffect`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum SubsystemRuptureOutcome {
    /// Roll `1-2`: Motive Actuator Severed (`MOV` halved, `-1` EVA, survives at `1` HP).
    ActuatorSevered = 0,
    /// Roll `3-4`: Targeting Bus Fried (`-1` Strike die, survives at `1` HP).
    TargetingBusFried = 1,
    /// Roll `5`: Reactor Coolant Leak (`1` Shock to self, survives at `1` HP).
    CoolantLeak = 2,
    /// Roll `6`: Core Meltdown (`2` Shock blast to adjacent sectors, chassis destroyed).
    CoreMeltdown = 3,
}

/// Deterministic Opposed Strike Resolution (`CombatEngine::resolveOpposedStrike`, `KZ-03`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct StrikeResolution {
    /// Whether Line of Sight was blocked by Solid Bulkhead Full Cover.
    pub line_of_sight_blocked: bool,
    /// Whether the attacker earned the `+1` automatic hit from a 4-sector Momentum Charge.
    pub momentum_charge_bonus: u8,
    /// Total attacker successes (`dice >= 4` + `momentum_charge_bonus`).
    pub attacker_successes: u8,
    /// Total defender Evasion successes (`dice >= 4` + `1` if `LowBarricadePartial`).
    pub defender_evasion_successes: u8,
    /// Net uncancelled hits (`attacker_successes.saturating_sub(defender_evasion_successes)`).
    pub net_hits: u8,
    /// Total damage mitigation from Reinforced Plating (`ARM`) + Bio-Resilience (`TGH`).
    pub total_mitigation: u8,
    /// Final Vitality Damage inflicted (`net_hits.saturating_sub(total_mitigation)`, min `1` on Critical `6` when `net_hits > 0`).
    pub vitality_damage: u8,
}

/// Fireteam (`ECH-0` & `ECH-1`) casualty spillover summary (`CombatEngine::resolveFireteamSpillover`, `KZ-03`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FireteamSpillover {
    /// Bodies remaining in the Berth after applying `vitality_damage`.
    pub remaining_bodies: u8,
    /// Remaining vitality across surviving bodies in the Berth.
    pub remaining_vitality: u8,
    /// Casualties eliminated by this strike (`initial_bodies - remaining_bodies`).
    pub bodies_lost: u8,
}

/// Six Nemesis Core 4.0 Resonance Frequencies (`ResonanceWeave::ResonanceFrequency`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum ResonanceFrequency {
    /// Kinetic vector acceleration & rail-shatter impulse.
    FerroKinetics = 0,
    /// Thermal ionization & armor-melting plasma lances.
    PlasmaArc = 1,
    /// Cellular knitting, metabolic overdrive & spore clouds.
    BioSynth = 2,
    /// Automaton logic hijacking & Command Chit scramble.
    NeuroHacking = 3,
    /// Short-range phase-step translocation & cover bypass.
    FoldSpace = 4,
    /// Temporal dilation, reaction overwatch & initiative steal.
    ChronoDrift = 5,
}

/// Resonance Weave Cast Evaluation (`ResonanceWeave::evaluateResonanceWeave`, `KZ-04`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ResonanceEvaluation {
    /// Selected Resonance Frequency.
    pub frequency: ResonanceFrequency,
    /// Caster Harmonic Rank (`Echelon - 1`, or `0` for `ECH-0`/`ECH-1`).
    pub harmonic_rank: u8,
    /// Number of d6 successes (`>= 4`) rolled on the Weave test.
    pub successes: u8,
    /// Whether the Minor Harmonic (`1+` success) triggered.
    pub minor_harmonic_triggered: bool,
    /// Whether the Major Harmonic (`2+` successes) triggered.
    pub major_harmonic_triggered: bool,
    /// Whether Psionic Backlash triggered (double `1`s rolled on Weave dice).
    pub backlash_triggered: bool,
    /// Self-inflicted vitality loss from Backlash (`0..=2`).
    pub backlash_vitality_loss: u8,
}

/// Count successes (`>= 4`) and natural `6`s and natural `1`s in a slice of d6 rolls.
#[must_use]
pub const fn count_d6_outcomes(rolls: &[u8]) -> (u8, u8, u8) {
    let mut i = 0usize;
    let mut successes = 0u8;
    let mut sixes = 0u8;
    let mut ones = 0u8;
    while i < rolls.len() {
        let die = rolls[i];
        if die >= 4 {
            successes = successes.saturating_add(1);
        }
        if die == 6 {
            sixes = sixes.saturating_add(1);
        }
        if die == 1 {
            ones = ones.saturating_add(1);
        }
        i += 1;
    }
    (successes, sixes, ones)
}

/// Resolve an Opposed d6 Strike Pool roll (`CombatEngine::resolveOpposedStrike`, `KZ-03`).
#[must_use]
pub const fn resolve_opposed_strike(
    attacker_rolls: &[u8],
    defender_rolls: &[u8],
    is_melee: bool,
    sectors_moved_in_line: u8,
    cover: CoverKind,
    defender_arm: u8,
    defender_tgh: u8,
) -> StrikeResolution {
    if !is_melee && matches!(cover, CoverKind::SolidBulkheadFull) {
        return StrikeResolution {
            line_of_sight_blocked: true,
            momentum_charge_bonus: 0,
            attacker_successes: 0,
            defender_evasion_successes: 0,
            net_hits: 0,
            total_mitigation: defender_arm.saturating_add(defender_tgh),
            vitality_damage: 0,
        };
    }

    let (atk_succ, atk_sixes, _) = count_d6_outcomes(attacker_rolls);
    let (def_succ, _, _) = count_d6_outcomes(defender_rolls);

    let momentum_charge_bonus = if is_melee && sectors_moved_in_line >= 4 {
        1u8
    } else {
        0u8
    };
    let cover_evasion_bonus = if !is_melee && matches!(cover, CoverKind::LowBarricadePartial) {
        1u8
    } else {
        0u8
    };

    let attacker_successes = atk_succ.saturating_add(momentum_charge_bonus);
    let defender_evasion_successes = def_succ.saturating_add(cover_evasion_bonus);
    let net_hits = attacker_successes.saturating_sub(defender_evasion_successes);
    let total_mitigation = defender_arm.saturating_add(defender_tgh);

    let raw_damage = net_hits.saturating_sub(total_mitigation);
    let vitality_damage = if net_hits > 0 && raw_damage == 0 && atk_sixes > 0 {
        1u8
    } else {
        raw_damage
    };

    StrikeResolution {
        line_of_sight_blocked: false,
        momentum_charge_bonus,
        attacker_successes,
        defender_evasion_successes,
        net_hits,
        total_mitigation,
        vitality_damage,
    }
}

/// Resolve Automaton `1d6` Subsystem Rupture (`CombatEngine::subsystemRuptureTable`, `KZ-03`).
#[must_use]
pub const fn resolve_subsystem_rupture(d6_roll: u8) -> SubsystemRuptureOutcome {
    match d6_roll {
        1 | 2 => SubsystemRuptureOutcome::ActuatorSevered,
        3 | 4 => SubsystemRuptureOutcome::TargetingBusFried,
        5 => SubsystemRuptureOutcome::CoolantLeak,
        _ => SubsystemRuptureOutcome::CoreMeltdown,
    }
}

/// Resolve destructible Low Barricade Structure Point (`4 SP`) demolition
/// (`CombatEngine::resolveCoverAfterDemolition`, `KZ-03`).
/// Returns `(remaining_sp, resulting_cover)`.
#[must_use]
pub const fn resolve_cover_demolition(
    cover: CoverKind,
    current_sp: u8,
    incoming_damage: u8,
) -> (u8, CoverKind) {
    match cover {
        CoverKind::LowBarricadePartial => {
            let remaining_sp = current_sp.saturating_sub(incoming_damage);
            if remaining_sp == 0 {
                (0, CoverKind::Open)
            } else {
                (remaining_sp, CoverKind::LowBarricadePartial)
            }
        }
        other => (current_sp, other),
    }
}

/// Resolve Fireteam (`ECH-0` & `ECH-1`) casualty spillover across multi-body Berths
/// (`CombatEngine::resolveFireteamSpillover`, `KZ-03`).
#[must_use]
pub const fn resolve_fireteam_spillover(
    initial_bodies: u8,
    hp_per_body: u8,
    current_vitality: u8,
    vitality_damage: u8,
) -> FireteamSpillover {
    let remaining_vitality = current_vitality.saturating_sub(vitality_damage);
    let step_hp = if hp_per_body == 0 { 1 } else { hp_per_body };
    let remaining_bodies = if remaining_vitality == 0 {
        0
    } else {
        let b = remaining_vitality.div_ceil(step_hp);
        if b > initial_bodies {
            initial_bodies
        } else {
            b
        }
    };
    let bodies_lost = initial_bodies.saturating_sub(remaining_bodies);
    FireteamSpillover {
        remaining_bodies,
        remaining_vitality,
        bodies_lost,
    }
}

/// Evaluate a 6-Frequency Resonance Weave invocation and Backlash check
/// (`ResonanceWeave::evaluateResonanceWeave`, `KZ-04`).
#[must_use]
pub const fn evaluate_resonance_weave(
    frequency: ResonanceFrequency,
    echelon_index: u8,
    weave_rolls: &[u8],
) -> ResonanceEvaluation {
    let harmonic_rank = echelon_index.saturating_sub(1);
    let (successes, _, ones) = count_d6_outcomes(weave_rolls);
    let backlash_triggered = ones >= 2;
    let backlash_vitality_loss = if backlash_triggered {
        if ones >= 3 {
            2
        } else {
            1
        }
    } else {
        0
    };
    ResonanceEvaluation {
        frequency,
        harmonic_rank,
        successes,
        minor_harmonic_triggered: successes >= 1,
        major_harmonic_triggered: successes >= 2,
        backlash_triggered,
        backlash_vitality_loss,
    }
}
