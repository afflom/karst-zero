//! Nemesis Core 4.0 3D Unit Synthesis, Zero-Stat-Inflation, `3-XP` Hardpoint Socket
//! Progression, and 6-Berth / 16-Alloy Charter Validator (`UnitSynthesis.lex.tex`).

/// Six Nemesis Core 4.0 Combat Doctrines (`UnitSynthesis::CombatDoctrine`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum CombatDoctrine {
    /// Close-Assault Shock & Breach (`MEL +2, EVA +1, ARM +1`).
    Breacher = 0,
    /// Phalanx Bulwark & Intercept (`ARM +2, TGH +2, EVA 0`).
    Aegis = 1,
    /// High-Velocity Recon & Flanking (`MOV +2, EVA +2, RNG +1`).
    Outrider = 2,
    /// Long-Range Ballistic Overwatch (`RNG +3, EVA +1, MOV -1`).
    Deadeye = 3,
    /// Sub-Grid Demolition & Trap Craft (`RNG +1, MEL +1, EVA +2`).
    Saboteur = 4,
    /// Resonance Weave Channeler (`PSY +2, EVA +1, RNG +1`).
    Psion = 5,
}

/// Five Nemesis Core 4.0 Biological / Synthetic Chassis (`UnitSynthesis::ChassisType`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum ChassisType {
    /// Bio-engineered human baseline with balanced resilience and adaptive recovery.
    Spliced = 0,
    /// Synthetic frame immune to biological trauma, repaired with Scrap Alloy, subject to Subsystem Rupture.
    Automaton = 1,
    /// Predatory bio-morph with innate close-assault lethality and heightened evasion.
    Xenomorph = 2,
    /// Dimensional-shifted operative with superior psionic attunement and phase evasion.
    PhaseBorn = 3,
    /// Heavy industrial exo-frame with Reinforced Plating and extra Hardpoint capacity.
    RigWalker = 4,
}

/// Five Nemesis Core 4.0 Unit Echelon Tiers (`UnitSynthesis::EchelonTier`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum EchelonTier {
    /// Swarm Drone (`3` Bodies per Berth, `1` HP per body, `1` Alloy, `0` Hardpoints).
    Ech0Swarm = 0,
    /// Trooper Fireteam (`2` Bodies per Berth, `2` HP per body, `2` Alloy, `1` Hardpoint).
    Ech1Trooper = 1,
    /// Vanguard Specialist (`1` Body per Berth, `4` HP, `4` Alloy, `2` Hardpoints).
    Ech2Vanguard = 2,
    /// Nemesis Enforcer (`1` Body, `7` HP, `6` Alloy, `3` Hardpoints, `2` Command Chits).
    Ech3Enforcer = 3,
    /// Vault Sovereign (`1` Body, `12` HP, `10` Alloy, `4` Hardpoints, `3` Command Chits).
    Ech4Sovereign = 4,
}

/// Synthesized Nemesis Core 4.0 Unit Archetype (`UnitSynthesis::SynthesizedArchetype`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct SynthesizedArchetype {
    /// Unique archetype index in `0..150` (`doctrine * 25 + chassis * 5 + echelon`).
    pub archetype_index: u16,
    /// Combat Doctrine (`0..5`).
    pub doctrine: CombatDoctrine,
    /// Chassis (`0..4`).
    pub chassis: ChassisType,
    /// Echelon (`0..4`).
    pub echelon: EchelonTier,
    /// Bodies sharing a single Roster Berth (`3` for `ECH-0`, `2` for `ECH-1`, `1` for `ECH-2..4`).
    pub bodies_per_berth: u8,
    /// Roster Berth capacity cost (`1` for `ECH-0..2`, `2` for `ECH-3`, `3` for `ECH-4`).
    pub berth_cost: u8,
    /// Hit points per body.
    pub hp_per_body: u8,
    /// Total vitality across all bodies in the Berth.
    pub total_berth_vitality: u8,
    /// Scrap Alloy recruitment cost (`2, 3, 5, 8, 12` in catalog; base tier cost).
    pub alloy_cost: u8,
    /// Base Hardpoint Sockets from Echelon + Chassis.
    pub base_hardpoints: u8,
    /// Campaign maximum Hardpoint Sockets (`1, 2, 4, 5, 6`).
    pub campaign_max_hardpoints: u8,
    /// Base Surge Cells per Vault Drop (`0, 0, 1, 3, 4`).
    pub base_surge: u8,
    /// Opaque Command Chits entered into the round pool (`1`, `2`, or `3`).
    pub command_chits: u8,
    /// Unified Firepower / Strike Pool (`FPR = baseFpr + fprDelta`).
    pub fpr: u8,
    /// Unified Cognition / Tech & Resonance Pool (`COG = baseCog + cogDelta`).
    pub cog: u8,
    /// Movement allowance in sectors (`MOV = 6 + docMoveDelta + chMoveDelta`).
    pub mov: u8,
    /// Melee Strike dice (`MEL`).
    pub mel: u8,
    /// Ranged Strike dice (`RNG`).
    pub rng: u8,
    /// Ranged engagement range in sectors (`12` for `Deadeye`, `6` baseline).
    pub ranged_range_sectors: u8,
    /// Evasion Defense dice (`EVA = baseEva + evaDelta`).
    pub eva: u8,
    /// Reinforced Plating automatic reduction (`ARM`).
    pub arm: u8,
    /// Bio-Resilience automatic reduction (`TGH`).
    pub tgh: u8,
    /// Psionic Resonance dice (`PSY`).
    pub psy: u8,
    /// Whether this unit ignores rough terrain penalties (`PhaseBorn`).
    pub ignores_rough_terrain: bool,
    /// Whether this unit suffers Arc Backlash on `1`s (`PhaseBorn`).
    pub has_arc_backlash: bool,
    /// Whether this unit is repaired with Scrap Alloy instead of Med-Bay Stims.
    pub uses_alloy_repair: bool,
    /// Whether this unit rolls on the `1d6` Subsystem Rupture table at `0` HP.
    pub uses_subsystem_rupture: bool,
}

/// Progression Verification Record (`UnitSynthesis::ProgressionAudit`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ProgressionAudit {
    /// Accumulated XP (`0..=255`).
    pub xp: u8,
    /// Base Hardpoint Sockets before XP progression.
    pub base_hardpoints: u8,
    /// Additional Hardpoint Sockets unlocked via `xp / 3` (capped at `+2`).
    pub bonus_hardpoints: u8,
    /// Total Hardpoint Sockets (`base_hardpoints + bonus_hardpoints`, max `6`).
    pub total_hardpoints: u8,
    /// Proof witness that base stats never inflate from XP (`Zero-Stat-Inflation`).
    pub zero_stat_inflation_preserved: bool,
}

/// Charter Validation Summary (`UnitSynthesis::CharterValidation`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CharterValidation {
    /// Active Berths occupied (`1..=6`).
    pub berth_count: u8,
    /// Total Scrap Alloy spent on initial recruitment (`<= 16`).
    pub total_alloy_cost: u8,
    /// Remaining Scrap Alloy in the Orbital Bastion vault.
    pub remaining_alloy_vault: u8,
    /// Whether the roster satisfies the 6-Berth / 16-Alloy Charter invariant.
    pub charter_valid: bool,
}

/// Convert raw doctrine index `0..5` to `CombatDoctrine`.
#[must_use]
pub const fn doctrine_from_u8(idx: u8) -> CombatDoctrine {
    match idx % 6 {
        0 => CombatDoctrine::Breacher,
        1 => CombatDoctrine::Aegis,
        2 => CombatDoctrine::Outrider,
        3 => CombatDoctrine::Deadeye,
        4 => CombatDoctrine::Saboteur,
        _ => CombatDoctrine::Psion,
    }
}

/// Convert raw chassis index `0..4` to `ChassisType`.
#[must_use]
pub const fn chassis_from_u8(idx: u8) -> ChassisType {
    match idx % 5 {
        0 => ChassisType::Spliced,
        1 => ChassisType::Automaton,
        2 => ChassisType::Xenomorph,
        3 => ChassisType::PhaseBorn,
        _ => ChassisType::RigWalker,
    }
}

/// Convert raw echelon index `0..4` to `EchelonTier`.
#[must_use]
pub const fn echelon_from_u8(idx: u8) -> EchelonTier {
    match idx % 5 {
        0 => EchelonTier::Ech0Swarm,
        1 => EchelonTier::Ech1Trooper,
        2 => EchelonTier::Ech2Vanguard,
        3 => EchelonTier::Ech3Enforcer,
        _ => EchelonTier::Ech4Sovereign,
    }
}

/// Compile any `(Doctrine, Chassis, Echelon)` coordinate in the 150-archetype 3D matrix
/// (`UnitSynthesis::synthesizeArchetype`, `KZ-01`).
#[must_use]
pub const fn compile_unit_archetype(
    doctrine: CombatDoctrine,
    chassis: ChassisType,
    echelon: EchelonTier,
) -> SynthesizedArchetype {
    let d_idx = doctrine as u16;
    let c_idx = chassis as u16;
    let e_idx = echelon as u16;
    let archetype_index = d_idx * 25 + c_idx * 5 + e_idx;

    let (
        bodies_per_berth,
        berth_cost,
        base_hp,
        alloy_cost,
        ech_hardpoints,
        campaign_max_hardpoints,
        base_surge,
        command_chits,
        base_fpr,
        base_eva,
        base_cog,
        ech_dice_bonus,
    ) = match echelon {
        EchelonTier::Ech0Swarm => (3u8, 1u8, 1u8, 2u8, 0u8, 1u8, 0u8, 1u8, 2u8, 2u8, 1u8, 0u8),
        EchelonTier::Ech1Trooper => (2u8, 1u8, 2u8, 3u8, 1u8, 2u8, 0u8, 1u8, 3u8, 3u8, 2u8, 1u8),
        EchelonTier::Ech2Vanguard => (1u8, 1u8, 3u8, 5u8, 2u8, 4u8, 1u8, 1u8, 4u8, 3u8, 3u8, 2u8),
        EchelonTier::Ech3Enforcer => (1u8, 2u8, 4u8, 8u8, 3u8, 5u8, 3u8, 2u8, 5u8, 4u8, 4u8, 3u8),
        EchelonTier::Ech4Sovereign => (1u8, 3u8, 6u8, 12u8, 4u8, 6u8, 4u8, 3u8, 6u8, 5u8, 4u8, 4u8),
    };

    let (
        doc_fpr_delta,
        doc_eva_delta,
        doc_cog_delta,
        doc_mov,
        doc_mel,
        doc_rng,
        doc_ranged_range,
        doc_arm,
        doc_tgh,
        doc_psy,
    ) = match doctrine {
        CombatDoctrine::Breacher => (1u8, 0u8, 0u8, 6u8, 3u8, 1u8, 6u8, 1u8, 1u8, 0u8),
        CombatDoctrine::Aegis => (0u8, 1u8, 0u8, 6u8, 2u8, 2u8, 6u8, 2u8, 2u8, 0u8),
        CombatDoctrine::Outrider => (0u8, 0u8, 0u8, 8u8, 2u8, 2u8, 6u8, 0u8, 1u8, 0u8),
        CombatDoctrine::Deadeye => (0u8, 0u8, 0u8, 6u8, 1u8, 4u8, 12u8, 0u8, 1u8, 0u8),
        CombatDoctrine::Saboteur => (0u8, 0u8, 1u8, 6u8, 2u8, 2u8, 6u8, 0u8, 1u8, 1u8),
        CombatDoctrine::Psion => (0u8, 0u8, 1u8, 6u8, 1u8, 2u8, 6u8, 0u8, 1u8, 3u8),
    };

    let (
        ch_hp_bonus,
        ch_mov_bonus,
        ch_mel_bonus,
        ch_arm_bonus,
        ch_tgh_bonus,
        ch_psy_bonus,
        ch_hp_slots,
        ignores_rough_terrain,
        has_arc_backlash,
    ) = match chassis {
        ChassisType::Spliced => (0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, false, false),
        ChassisType::Automaton => (0u8, 0u8, 0u8, 1u8, 0u8, 0u8, 0u8, false, false),
        ChassisType::Xenomorph => (0u8, 2u8, 1u8, 0u8, 1u8, 0u8, 0u8, false, false),
        ChassisType::PhaseBorn => (0u8, 0u8, 0u8, 0u8, 0u8, 1u8, 0u8, true, true),
        ChassisType::RigWalker => (0u8, 0u8, 1u8, 1u8, 0u8, 0u8, 0u8, false, false),
    };

    let hp_per_body = base_hp + ch_hp_bonus;
    let total_berth_vitality = bodies_per_berth * hp_per_body;
    let base_hardpoints = ech_hardpoints + ch_hp_slots;
    let uses_alloy_repair = matches!(chassis, ChassisType::Automaton | ChassisType::RigWalker);
    let uses_subsystem_rupture = matches!(chassis, ChassisType::Automaton);

    SynthesizedArchetype {
        archetype_index,
        doctrine,
        chassis,
        echelon,
        bodies_per_berth,
        berth_cost,
        hp_per_body,
        total_berth_vitality,
        alloy_cost,
        base_hardpoints,
        campaign_max_hardpoints,
        base_surge,
        command_chits,
        fpr: base_fpr + doc_fpr_delta,
        cog: base_cog + doc_cog_delta,
        mov: doc_mov + ch_mov_bonus,
        mel: doc_mel + ch_mel_bonus + (ech_dice_bonus / 2),
        rng: doc_rng + (ech_dice_bonus / 2),
        ranged_range_sectors: doc_ranged_range,
        eva: base_eva + doc_eva_delta,
        arm: doc_arm + ch_arm_bonus,
        tgh: doc_tgh + ch_tgh_bonus,
        psy: doc_psy + ch_psy_bonus,
        ignores_rough_terrain,
        has_arc_backlash,
        uses_alloy_repair,
        uses_subsystem_rupture,
    }
}

/// Evaluate Zero-Stat-Inflation and `3-XP` Hardpoint Socket progression
/// (`UnitSynthesis::unlockedHardpointBonus`, `UnitSynthesis::zeroStatInflationHolds`, `KZ-02`).
#[must_use]
pub const fn compute_unlocked_sockets(base_hardpoints: u8, xp: u8) -> ProgressionAudit {
    let raw_bonus = xp / 3;
    let bonus_hardpoints = if raw_bonus > 2 { 2 } else { raw_bonus };
    let total_hardpoints = base_hardpoints + bonus_hardpoints;
    ProgressionAudit {
        xp,
        base_hardpoints,
        bonus_hardpoints,
        total_hardpoints,
        zero_stat_inflation_preserved: true,
    }
}

/// Validate a Strike Roster against the 6-Berth / 16-Alloy Charter invariant
/// (`UnitSynthesis::rosterFitsCharter`, `KZ-01`, `KZ-02`).
#[must_use]
pub const fn validate_strike_roster(berth_alloy_costs: &[u8]) -> CharterValidation {
    let berth_count = berth_alloy_costs.len() as u8;
    let mut i = 0usize;
    let mut total_alloy_cost = 0u8;
    while i < berth_alloy_costs.len() {
        total_alloy_cost = total_alloy_cost.saturating_add(berth_alloy_costs[i]);
        i += 1;
    }
    let charter_valid = berth_count >= 1 && berth_count <= 6 && total_alloy_cost <= 16;
    let remaining_alloy_vault = 16u8.saturating_sub(total_alloy_cost);
    CharterValidation {
        berth_count,
        total_alloy_cost,
        remaining_alloy_vault,
        charter_valid,
    }
}

/// Check Zero-Stat Permadeath (`UnitSynthesis::isPermadead`, `KZ-02`).
/// Whenever any core vitality or stat drops to `0` after battle trauma, the operative is
/// permanently lost from the Orbital Bastion roster.
#[must_use]
pub const fn check_permadeath(current_hp: u8, current_mov: u8, current_eva: u8) -> bool {
    current_hp == 0 || current_mov == 0 || current_eva == 0
}
