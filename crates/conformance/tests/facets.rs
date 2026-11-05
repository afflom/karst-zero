//! Conformance tests for `KZ-08`..`KZ-16`.
//!
//! Verifies the ISO/IEC/IEEE 42010 stakeholder/viewpoint architecture (`KZ-08`),
//! 6-component / 8-edge Nemesis Core 4.0 system topology (`KZ-09`), ISO/IEC 27034
//! security & ISO/IEC 25010 quality facets (`KZ-10`), ISO/PAS 19450 OPM & OMG UML
//! 2.5.1 design views (`KZ-11`), WCAG 2.2 AA branding & UI/UX presentation (`KZ-12`),
//! progressive 5-pole user journeys (`KZ-13`), normative standards profile (`KZ-14`),
//! the unified Karst: Zero Horizon release profile (`KZ-15`), and the 2.5D Object-Spatial
//! Projection & Karst-9 World Catalog (`KZ-16`).

use std::path::{Path, PathBuf};

use karst_kernel::nemesis::meets_wcag_contrast_tenths;
use karst_kernel::spatial::{
    compute_isometric_depth_key, evaluate_spatial_trajectory, warden_force_for_threat,
};
use karst_kernel::synthesis::EchelonTier;

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
        Some(6)
    );
    assert_eq!(
        arch.get("viewpoints")
            .and_then(|v| v.as_array())
            .map(Vec::len),
        Some(6)
    );
    assert_eq!(
        arch.get("views").and_then(|v| v.as_array()).map(Vec::len),
        Some(6)
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
        Some(6)
    );
    assert_eq!(
        arch.get("edges").and_then(|v| v.as_array()).map(Vec::len),
        Some(8)
    );
    let arch_spec = std::fs::read_to_string(root.join("src/Architecture.lex.tex"))
        .expect("src/Architecture.lex.tex must be readable");
    assert!(arch_spec.contains("name: feature00UnitSynthesisAndCharter"));
    assert!(arch_spec.contains("name: feature05NemesisEngineFullBinding"));
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
    assert!(spec.contains("name: viewNemesisComponentUml"));
    assert!(spec.contains("name: viewStrikeDispatchSequenceUml"));
    assert!(spec.contains("name: viewCampaignTurnStateUml"));
    let build_dir = find_prism_build_dir(&root);
    let design_dir = build_dir.join("design");
    for diagram in [
        "Design.viewUnitSynthesisOpm.opl",
        "Design.viewCombatChitOpm.opl",
        "Design.viewNemesisComponentUml.puml",
        "Design.viewStrikeDispatchSequenceUml.puml",
        "Design.viewCampaignTurnStateUml.puml",
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
