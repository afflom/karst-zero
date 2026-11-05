//! Conformance tests for `KZ-08`..`KZ-17`.
//!
//! Verifies the ISO/IEC/IEEE 42010 stakeholder/viewpoint architecture (`KZ-08`),
//! 6-component / 8-edge Nemesis Core 4.0 system topology (`KZ-09`), ISO/IEC 27034
//! security & ISO/IEC 25010 quality facets (`KZ-10`), ISO/PAS 19450 OPM & OMG UML
//! 2.5.1 design views (`KZ-11`), WCAG 2.2 AA branding & UI/UX presentation (`KZ-12`),
//! progressive 5-pole user journeys (`KZ-13`), normative standards profile (`KZ-14`),
//! the unified Karst: Zero Horizon release profile (`KZ-15`), the 2.5D Object-Spatial
//! Projection & Karst-9 World Catalog (`KZ-16`), and the Animation & Kinetic
//! Choreography Model (`KZ-17`).

use std::path::{Path, PathBuf};

use karst_kernel::animation::{
    animation_clip_metadata, chassis_gait_profile, clamp_decile, classify_sub_phase,
    doctrine_vfx_profile, evaluate_animation_progress_permille, evaluate_articulated_pose,
    evaluate_camera_shake_px, evaluate_muzzle_flash_permille, evaluate_parabolic_arc_scaled,
    evaluate_quad_out_permille, evaluate_shockwave_permille, evaluate_torso_lean_scaled,
    sample_spatial_keyframe, AnimationClipKind, AnimationSubPhase, EasingCurve,
};
use karst_kernel::nemesis::meets_wcag_contrast_tenths;
use karst_kernel::spatial::{
    compute_isometric_depth_key, evaluate_spatial_trajectory, warden_force_for_threat,
};
use karst_kernel::synthesis::{ChassisType, CombatDoctrine, EchelonTier};

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("crates/conformance lives two levels below the repository root")
        .to_path_buf()
}

fn find_prism_build_dir(root: &Path) -> PathBuf {
    let build_dir = root.join(".prism/build");
    let entries = std::fs::read_dir(&build_dir).expect("read .prism/build");
    for entry in entries.flatten() {
        if entry.path().join("model.prism.json").is_file() {
            return entry.path();
        }
    }
    panic!("no build directory found under .prism/build");
}

fn load_prism_model(root: &Path) -> serde_json::Value {
    let build_dir = find_prism_build_dir(root);
    let model_path = build_dir.join("model.prism.json");
    let text = std::fs::read_to_string(&model_path).expect("read model.prism.json");
    serde_json::from_str(&text).expect("parse model.prism.json")
}

#[test]
fn stakeholders_kz_08() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/Architecture.lex.tex"))
        .expect("src/Architecture.lex.tex must be readable");
    assert!(spec.contains("name: stakeholderIdsDistinct"));
    assert!(spec.contains("name: viewpointsResolveToStakeholders"));
    let model = load_prism_model(&root);
    let arch = model.get("architecture").expect("architecture section");
    assert_eq!(
        arch.get("stakeholders")
            .and_then(|v| v.as_array())
            .map(Vec::len),
        Some(4)
    );
    assert_eq!(
        arch.get("concerns")
            .and_then(|v| v.as_array())
            .map(Vec::len),
        Some(7)
    );
    assert_eq!(
        arch.get("viewpoints")
            .and_then(|v| v.as_array())
            .map(Vec::len),
        Some(7)
    );
    assert_eq!(
        arch.get("views").and_then(|v| v.as_array()).map(Vec::len),
        Some(7)
    );
    assert_eq!(
        model
            .get("standards_profile")
            .and_then(|v| v.as_array())
            .map(Vec::len),
        Some(5)
    );
}

#[test]
fn system_kz_09() {
    let root = repo_root();
    let model = load_prism_model(&root);
    let arch = model.get("architecture").expect("architecture section");
    assert_eq!(
        arch.get("components")
            .and_then(|v| v.as_array())
            .map(Vec::len),
        Some(7)
    );
    assert_eq!(
        arch.get("edges").and_then(|v| v.as_array()).map(Vec::len),
        Some(11)
    );
    let arch_spec = std::fs::read_to_string(root.join("src/Architecture.lex.tex"))
        .expect("src/Architecture.lex.tex must be readable");
    assert!(arch_spec.contains("name: feature00UnitSynthesisAndCharter"));
    assert!(arch_spec.contains("name: feature05NemesisEngineFullBinding"));
    assert!(arch_spec.contains("name: feature07AnimationChoreographyAndVfx"));
    assert!(arch_spec.contains("name: journey00TacticalCommander"));
    assert!(arch_spec.contains("name: journey03PrismRuntimeAuditor"));
}

#[test]
fn security_kz_10() {
    let root = repo_root();
    let model = load_prism_model(&root);
    let sec = model.get("security").expect("security section");
    for field in [
        "assets",
        "threats",
        "risks",
        "controls",
        "activities",
        "measurements",
    ] {
        let arr = sec
            .get(field)
            .and_then(|v| v.as_array())
            .expect("security array");
        assert_eq!(arr.len(), 4, "security.{field} must have 4 entries");
    }
    let qual = model.get("quality").expect("quality section");
    for field in [
        "characteristics",
        "subcharacteristics",
        "requirements",
        "measures",
    ] {
        let arr = qual
            .get(field)
            .and_then(|v| v.as_array())
            .expect("quality array");
        assert_eq!(arr.len(), 4, "quality.{field} must have 4 entries");
    }
}

#[test]
fn design_kz_11() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/Design.lex.tex"))
        .expect("src/Design.lex.tex must be readable");
    assert!(spec.contains("name: viewUnitSynthesisOpm"));
    assert!(spec.contains("name: viewCombatChitOpm"));
    assert!(spec.contains("name: viewAnimationChoreographyOpm"));
    assert!(spec.contains("name: viewNemesisComponentUml"));
    assert!(spec.contains("name: viewStrikeDispatchSequenceUml"));
    assert!(spec.contains("name: viewCampaignTurnStateUml"));
    assert!(spec.contains("name: viewAnimationClipStateUml"));
    let build_dir = find_prism_build_dir(&root);
    let design_dir = build_dir.join("design");
    for diagram in [
        "Design.viewUnitSynthesisOpm.opl",
        "Design.viewCombatChitOpm.opl",
        "Design.viewAnimationChoreographyOpm.opl",
        "Design.viewNemesisComponentUml.puml",
        "Design.viewStrikeDispatchSequenceUml.puml",
        "Design.viewCampaignTurnStateUml.puml",
        "Design.viewAnimationClipStateUml.puml",
    ] {
        assert!(
            design_dir.join(diagram).is_file(),
            "missing compiled design view {diagram}"
        );
    }
}

#[test]
fn branding_ux_kz_12() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/Presentation.lex.tex"))
        .expect("src/Presentation.lex.tex must be readable");
    assert!(spec.contains("name: designTokens"));
    assert!(spec.contains("name: contrastPairs"));
    assert!(spec.contains("name: everyPairMeetsContrastLight"));
    assert!(spec.contains("name: everyPairMeetsContrastDark"));
    assert!(meets_wcag_contrast_tenths(878, 8, 45));
    assert!(meets_wcag_contrast_tenths(969, 24, 45));
    for page in [
        "view/index.html",
        "view/model.prism.json",
        "view/register.json",
        "view/og-preview.png",
        "view/logo.svg",
    ] {
        assert!(
            root.join(page).is_file(),
            "missing rendered portal artifact {page}"
        );
    }

    let root_html =
        std::fs::read_to_string(root.join("index.html")).expect("index.html must be readable");
    let view_html = std::fs::read_to_string(root.join("view/index.html"))
        .expect("view/index.html must be readable");
    for html in [&root_html, &view_html] {
        assert!(html.contains("KARST: ZERO HORIZON — Nemesis Core 4.0"));
        assert!(html.contains(
            "property=\"og:image\" content=\"https://afflom.github.io/karst-zero/og-preview.png\""
        ));
        assert!(html.contains(
            "name=\"twitter:image\" content=\"https://afflom.github.io/karst-zero/og-preview.png\""
        ));
        assert!(!html.contains("Prism SDK Authoring Workbench"));
    }

    let metadata_json = std::fs::read_to_string(root.join("metadata.json"))
        .expect("metadata.json must be readable");
    assert!(metadata_json.contains("KARST: ZERO HORIZON"));
    assert!(!metadata_json.contains("Prism SDK Authoring Workbench"));

    let og_png = std::fs::read(root.join("view/og-preview.png")).expect("read view/og-preview.png");
    assert!(og_png.starts_with(b"\x89PNG\r\n\x1a\n"));
}

#[test]
fn user_journeys_kz_13() {
    let root = repo_root();
    let pres = std::fs::read_to_string(root.join("src/Presentation.lex.tex"))
        .expect("src/Presentation.lex.tex must be readable");
    assert!(pres.contains("name: journeysWalkPolesAndResolve"));
    assert!(pres.contains("name: everyStakeholderHasJourney"));
    assert!(pres.contains("name: navigationPatterns"));
    assert!(pres.contains("name: pedagogyGuides"));
}

#[test]
fn security_kz_14() {
    let root = repo_root();
    let std_spec = std::fs::read_to_string(root.join("src/Standards.lex.tex"))
        .expect("src/Standards.lex.tex must be readable");
    assert!(std_spec.contains("name: standards"));
    assert!(std_spec.contains("name: everyPanelCoveredByStandard"));
    assert!(std_spec.contains("name: everyArtifactCoveredByStandard"));
    assert!(std_spec.contains("name: everyJourneyCoveredByStandard"));
    assert!(std_spec.contains("name: everyModuleCoveredByStandard"));
}

#[test]
fn contract_kz_15() {
    let root = repo_root();
    let main_spec = std::fs::read_to_string(root.join("src/Main.lex.tex"))
        .expect("src/Main.lex.tex must be readable");
    assert!(main_spec.contains("name: releaseProfile"));
    assert!(main_spec.contains("name: releaseSynthesizes150Archetypes"));
    assert!(main_spec.contains("name: releaseFullNemesisCore4Consumed"));
    assert!(main_spec.contains("name: releaseSpatialWorldAndPresetsVerified"));
    assert!(main_spec.contains("name: releaseWcagAndStandardsVerified"));
    let model = load_prism_model(&root);
    assert!(model.get("architecture").is_some());
    assert!(model.get("security").is_some());
    assert!(model.get("quality").is_some());
}

#[test]
fn system_kz_16() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/SpatialWorld.lex.tex"))
        .expect("src/SpatialWorld.lex.tex must be readable");
    assert!(spec.contains("name: spatialObjectCategoryCountIsSeven"));
    assert!(spec.contains("name: worldLocationCountIsSeven"));
    assert!(spec.contains("name: minorDirectiveCountIsNine"));
    assert!(spec.contains("name: allStartingPresetsValid"));
    assert!(spec.contains("name: isometricDepthOrderingMonotonic"));

    assert!(compute_isometric_depth_key(2, 3, 0) < compute_isometric_depth_key(3, 3, 0));
    assert!(compute_isometric_depth_key(3, 3, 0) < compute_isometric_depth_key(3, 3, 1));

    let clear = evaluate_spatial_trajectory(2, 2, 5, 4, 6, 0);
    assert_eq!(clear.manhattan_distance, 5);
    assert!(clear.trajectory_clear);

    let blocked = evaluate_spatial_trajectory(2, 2, 5, 4, 6, 1);
    assert!(!blocked.trajectory_clear);

    let low = warden_force_for_threat(1);
    assert_eq!(low.total_berth_weight, 4);
    assert_eq!(low.commander_echelon, EchelonTier::Ech2Vanguard);

    let high = warden_force_for_threat(3);
    assert_eq!(high.total_berth_weight, 6);
    assert_eq!(high.commander_echelon, EchelonTier::Ech4Sovereign);
}

#[test]
fn system_kz_17() {
    let root = repo_root();
    let spec = std::fs::read_to_string(root.join("src/AnimationEngine.lex.tex"))
        .expect("src/AnimationEngine.lex.tex must be readable");
    assert!(spec.contains("name: animationClipCountIsEight"));
    assert!(spec.contains("name: chassisGaitCountIsFive"));
    assert!(spec.contains("name: doctrineVfxCountIsSix"));
    assert!(spec.contains("name: allAnimationClipsBoundedAndPositive"));
    assert!(spec.contains("name: quadOutCurveMonotonicAndExact"));
    assert!(spec.contains("name: parabolicArcPeaksAtMidpointAndLandsExact"));
    assert!(spec.contains("name: reducedMotionCollapsesToTerminalFrame"));

    assert_eq!(clamp_decile(14), 10);
    assert_eq!(evaluate_quad_out_permille(0), 0);
    assert_eq!(evaluate_quad_out_permille(5), 750);
    assert_eq!(evaluate_quad_out_permille(10), 1000);

    assert_eq!(evaluate_parabolic_arc_scaled(18, 0), 0);
    assert_eq!(evaluate_parabolic_arc_scaled(18, 5), 450);
    assert_eq!(evaluate_parabolic_arc_scaled(18, 10), 0);

    assert_eq!(evaluate_animation_progress_permille(5, false), 500);
    assert_eq!(evaluate_animation_progress_permille(0, true), 1000);
    assert_eq!(evaluate_animation_progress_permille(5, true), 1000);

    let stride_meta = animation_clip_metadata(AnimationClipKind::SectorStrideTranslation);
    assert_eq!(stride_meta.duration_ms, 420);
    assert_eq!(stride_meta.frame_count, 24);
    assert_eq!(stride_meta.easing, EasingCurve::QuadOut);
    assert!(!stride_meta.looping);

    let gait = chassis_gait_profile(ChassisType::PhaseBorn);
    assert_eq!(gait.idle_cycle_ms, 2800);
    assert_eq!(gait.stride_bob_permille, 60);
    assert!(gait.thruster_trail_active);

    let vfx = doctrine_vfx_profile(CombatDoctrine::Psion);
    assert_eq!(vfx.projectile_speed_permille, 900);
    assert_eq!(vfx.shockwave_radius_sectors, 3);

    let mid_frame = sample_spatial_keyframe(18, 5, false);
    assert_eq!(mid_frame.progress_permille, 500);
    assert_eq!(mid_frame.eased_permille, 750);
    assert_eq!(mid_frame.parabolic_arc_scaled, 450);
    assert!(!mid_frame.completed);

    let reduced_frame = sample_spatial_keyframe(18, 5, true);
    assert_eq!(reduced_frame.progress_permille, 1000);
    assert_eq!(reduced_frame.eased_permille, 1000);
    assert_eq!(reduced_frame.parabolic_arc_scaled, 0);
    assert!(reduced_frame.completed);

    assert!(spec.contains("name: subPhaseCoversAnticipationApexAndSettle"));
    assert!(spec.contains("name: articulatedPoseSettlesCleanlyAtTerminalDecile"));
    assert!(spec.contains("name: articulatedPoseRespectsReducedMotion"));

    assert_eq!(classify_sub_phase(0), AnimationSubPhase::AnticipationWindup);
    assert_eq!(classify_sub_phase(2), AnimationSubPhase::AnticipationWindup);
    assert_eq!(
        classify_sub_phase(5),
        AnimationSubPhase::ApexImpulseInFlight
    );
    assert_eq!(
        classify_sub_phase(9),
        AnimationSubPhase::FollowThroughSettle
    );

    assert_eq!(evaluate_torso_lean_scaled(120, 5), 600);
    assert_eq!(evaluate_torso_lean_scaled(120, 10), 0);
    assert_eq!(evaluate_muzzle_flash_permille(2), 1000);
    assert_eq!(evaluate_muzzle_flash_permille(10), 0);
    assert_eq!(evaluate_shockwave_permille(5), 200);
    assert_eq!(evaluate_shockwave_permille(9), 1000);
    assert_eq!(evaluate_shockwave_permille(10), 0);
    assert_eq!(evaluate_camera_shake_px(2, 5), 6);
    assert_eq!(evaluate_camera_shake_px(2, 10), 0);

    let apex_pose = evaluate_articulated_pose(18, 120, 2, 5, false);
    assert_eq!(apex_pose.sub_phase, AnimationSubPhase::ApexImpulseInFlight);
    assert_eq!(apex_pose.parabolic_lift_scaled, 450);
    assert_eq!(apex_pose.torso_lean_scaled, 600);
    assert_eq!(apex_pose.shockwave_permille, 200);
    assert_eq!(apex_pose.camera_shake_px, 6);

    let terminal_pose = evaluate_articulated_pose(18, 120, 2, 10, false);
    assert_eq!(terminal_pose.progress_permille, 1000);
    assert_eq!(terminal_pose.parabolic_lift_scaled, 0);
    assert_eq!(terminal_pose.torso_lean_scaled, 0);
    assert_eq!(terminal_pose.muzzle_flash_permille, 0);
    assert_eq!(terminal_pose.shockwave_permille, 0);
    assert_eq!(terminal_pose.camera_shake_px, 0);

    let reduced_pose = evaluate_articulated_pose(18, 120, 2, 3, true);
    assert_eq!(reduced_pose.progress_permille, 1000);
    assert_eq!(reduced_pose.parabolic_lift_scaled, 0);
    assert_eq!(reduced_pose.camera_shake_px, 0);
}
