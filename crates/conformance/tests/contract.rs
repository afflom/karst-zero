//! Conformance tests for `TC-01` and `KZ-01`..`KZ-07`.
//!
//! Verifies the template contract (`TC-01`), Nemesis Core 4.0 3D Unit Synthesis (`KZ-01`),
//! Zero-Stat-Inflation & `3-XP` Hardpoint Sockets (`KZ-02`), Unified d6 Strike Pool,
//! Cover, Automaton `1d6` Subsystem Rupture & Fireteam Spillover (`KZ-03`),
//! 6-Frequency Resonance Weave (`KZ-04`), 5-Round Opaque Command Chit Pool &
//! Doctrine AI (`KZ-05`), Orbital Bastion Campaign Ledger (`KZ-06`), and Full
//! Nemesis Core 4.0 Engine Binding (`KZ-07`).

use std::path::{Path, PathBuf};

use karst_kernel::combat::{
    evaluate_resonance_weave, resolve_fireteam_spillover, resolve_opposed_strike,
    resolve_subsystem_rupture, CoverKind, ResonanceFrequency, SubsystemRuptureOutcome,
};
use karst_kernel::nemesis::{
    boss_activations, resolve_bastion_assignment, select_doctrine_ai_action, select_warden_berth,
    settle_vault_extraction, verify_karst_nemesis_binding, DoctrineAiAction, PreDropAssignment,
};
use karst_kernel::synthesis::{
    chassis_from_u8, check_permadeath, compile_unit_archetype, compute_unlocked_sockets,
    doctrine_from_u8, echelon_from_u8, validate_strike_roster, ChassisType, CombatDoctrine,
    EchelonTier,
};
use karst_kernel::{conformant, Observation, Pin};

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("crates/conformance lives two levels below the repository root")
        .to_path_buf()
}

#[test]
fn contract_tc_01() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/Contract.lex.tex"))
        .expect("src/Contract.lex.tex must be readable");
    assert!(spec.contains("name: conformant"));
    assert!(spec.contains("name: conformant_decides"));
    assert!(spec.contains("(((conformant observation) = true) <-> (Conformant observation))"));
    let contract_json = std::fs::read_to_string(root.join("template-contract.json"))
        .expect("template-contract.json must be readable");
    let doc: serde_json::Value =
        serde_json::from_str(&contract_json).expect("parse template-contract.json");
    assert_eq!(
        doc.get("schema").and_then(|s| s.as_str()),
        Some("uor.template-contract/1")
    );
    let matching = Pin {
        locked: [0x42; 32],
        observed: [0x42; 32],
    };
    let drifted = Pin {
        locked: [0x42; 32],
        observed: [0x99; 32],
    };
    assert!(conformant(&Observation {
        devcontainer: matching,
        bootstrap: matching,
        agents: matching,
        verification: matching,
        sdk_lock: matching,
        template_lock: matching,
    }));
    assert!(!conformant(&Observation {
        devcontainer: matching,
        bootstrap: drifted,
        agents: matching,
        verification: matching,
        sdk_lock: matching,
        template_lock: matching,
    }));
}

#[test]
fn conceptual_kz_01() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/UnitSynthesis.lex.tex"))
        .expect("src/UnitSynthesis.lex.tex must be readable");
    assert!(spec.contains("name: unitSynthesisMatrixIs150"));
    assert!(spec.contains("name: startingCharterFits16AlloyAnd6Berths"));

    let mut count = 0usize;
    for d in 0..6u8 {
        for c in 0..5u8 {
            for e in 0..5u8 {
                let arch = compile_unit_archetype(
                    doctrine_from_u8(d),
                    chassis_from_u8(c),
                    echelon_from_u8(e),
                );
                assert_eq!(
                    arch.archetype_index,
                    u16::from(d) * 25 + u16::from(c) * 5 + u16::from(e)
                );
                count += 1;
            }
        }
    }
    assert_eq!(count, 150);

    let charter = validate_strike_roster(&[4, 4, 2, 2, 2, 1]);
    assert!(charter.charter_valid);
    assert_eq!(charter.berth_count, 6);
    assert_eq!(charter.total_alloy_cost, 15);
    assert_eq!(charter.remaining_alloy_vault, 1);

    let invalid = validate_strike_roster(&[6, 6, 6]);
    assert!(!invalid.charter_valid);
}

#[test]
fn conceptual_kz_02() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/UnitSynthesis.lex.tex"))
        .expect("src/UnitSynthesis.lex.tex must be readable");
    assert!(spec.contains("name: zeroStatInflationEnforced"));
    assert!(spec.contains("name: threeXpUnlocksOneSocket"));
    assert!(spec.contains("name: zeroStatTriggersPermadeath"));

    let p0 = compute_unlocked_sockets(2, 2);
    assert_eq!(p0.bonus_hardpoints, 0);
    assert_eq!(p0.total_hardpoints, 2);
    assert!(p0.zero_stat_inflation_preserved);

    let p1 = compute_unlocked_sockets(2, 3);
    assert_eq!(p1.bonus_hardpoints, 1);
    assert_eq!(p1.total_hardpoints, 3);

    let p2 = compute_unlocked_sockets(2, 9);
    assert_eq!(p2.bonus_hardpoints, 2);
    assert_eq!(p2.total_hardpoints, 4);

    assert!(check_permadeath(0, 4, 2));
    assert!(check_permadeath(3, 0, 2));
    assert!(!check_permadeath(3, 4, 2));
}

#[test]
fn conceptual_kz_03() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/CombatEngine.lex.tex"))
        .expect("src/CombatEngine.lex.tex must be readable");
    assert!(spec.contains("name: resolveOpposedNetHits"));
    assert!(spec.contains("name: subsystemRuptureTable"));
    assert!(spec.contains("name: fireteamSpilloverDividesCasualtiesExact"));

    let blocked = resolve_opposed_strike(
        &[6, 5, 4],
        &[1, 2],
        false,
        0,
        CoverKind::SolidBulkheadFull,
        1,
        1,
    );
    assert!(blocked.line_of_sight_blocked);
    assert_eq!(blocked.vitality_damage, 0);

    let charge = resolve_opposed_strike(&[6, 5, 4], &[2, 3], true, 4, CoverKind::Open, 1, 1);
    assert_eq!(charge.momentum_charge_bonus, 1);
    assert_eq!(charge.attacker_successes, 4);
    assert_eq!(charge.net_hits, 4);
    assert_eq!(charge.vitality_damage, 2);

    assert_eq!(
        resolve_subsystem_rupture(1),
        SubsystemRuptureOutcome::ActuatorSevered
    );
    assert_eq!(
        resolve_subsystem_rupture(4),
        SubsystemRuptureOutcome::TargetingBusFried
    );
    assert_eq!(
        resolve_subsystem_rupture(5),
        SubsystemRuptureOutcome::CoolantLeak
    );
    assert_eq!(
        resolve_subsystem_rupture(6),
        SubsystemRuptureOutcome::CoreMeltdown
    );

    let spillover = resolve_fireteam_spillover(3, 1, 3, 2);
    assert_eq!(spillover.remaining_bodies, 1);
    assert_eq!(spillover.bodies_lost, 2);
}

#[test]
fn conceptual_kz_04() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/ResonanceWeave.lex.tex"))
        .expect("src/ResonanceWeave.lex.tex must be readable");
    assert!(spec.contains("name: frequencies"));
    assert!(spec.contains("name: moduleCatalog"));
    assert!(spec.contains("name: backlashTable"));

    let eval = evaluate_resonance_weave(ResonanceFrequency::PlasmaArc, 3, &[6, 5, 1, 1]);
    assert_eq!(eval.harmonic_rank, 2);
    assert!(eval.minor_harmonic_triggered);
    assert!(eval.major_harmonic_triggered);
    assert!(eval.backlash_triggered);
    assert_eq!(eval.backlash_vitality_loss, 1);
}

#[test]
fn system_kz_05() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/NemesisChit.lex.tex"))
        .expect("src/NemesisChit.lex.tex must be readable");
    assert!(spec.contains("name: wardenChitReturnsToPool"));
    assert!(spec.contains("name: selectWardenBerthOneBased"));
    assert!(spec.contains("name: doctrineAiRoutines"));

    assert_eq!(boss_activations(EchelonTier::Ech1Trooper), 1);
    assert_eq!(boss_activations(EchelonTier::Ech3Enforcer), 2);
    assert_eq!(boss_activations(EchelonTier::Ech4Sovereign), 3);

    assert_eq!(select_warden_berth(5, 3), 2);
    assert_eq!(select_warden_berth(6, 4), 2);
    assert_eq!(
        select_doctrine_ai_action(CombatDoctrine::Breacher),
        DoctrineAiAction::MomentumChargeNearest
    );
    assert_eq!(
        select_doctrine_ai_action(CombatDoctrine::Psion),
        DoctrineAiAction::ChannelMajorHarmonicWeave
    );
}

#[test]
fn system_kz_06() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/CampaignBastion.lex.tex"))
        .expect("src/CampaignBastion.lex.tex must be readable");
    assert!(spec.contains("name: crewAssignments"));
    assert!(spec.contains("name: bastionFacilities"));
    assert!(spec.contains("name: sectorContracts"));

    assert_eq!(
        resolve_bastion_assignment(PreDropAssignment::ScrapSalvaging),
        (2, 0, 0, 0)
    );
    let settled = settle_vault_extraction(2, 4, 6, 9, 5, 3);
    assert_eq!(settled.updated_alloy_vault, 16);
    assert_eq!(settled.xp_awarded, 6);
    assert_ne!(settled.canonical_save_digest, 0);
}

#[test]
fn contract_kz_07() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/NemesisEngine.lex.tex"))
        .expect("src/NemesisEngine.lex.tex must be readable");
    assert!(spec.contains("name: engineSubsystems"));
    assert!(spec.contains("name: karstConsumesFullNemesisCore4Engine"));

    let app_spec = std::fs::read_to_string(root.join("src/Application.lex.tex"))
        .expect("src/Application.lex.tex must be readable");
    assert!(app_spec.contains("hologram:guest/core-wasm@1"));
    assert!(app_spec.contains("requestMaximum := 52"));
    assert!(app_spec.contains("responseMaximum := 27"));

    let witness = verify_karst_nemesis_binding();
    assert_eq!(witness.subsystem_count, 5);
    assert_eq!(witness.archetype_matrix_cardinality, 150);
    assert_eq!(witness.hardpoint_module_count, 16);
    assert_eq!(witness.sector_contract_count, 6);
    assert_eq!(witness.max_rounds_per_drop, 5);
    assert!(witness.full_engine_consumed);

    let arch_sample = compile_unit_archetype(
        CombatDoctrine::Psion,
        ChassisType::PhaseBorn,
        EchelonTier::Ech2Vanguard,
    );
    assert_eq!(arch_sample.psy, 4);
}
