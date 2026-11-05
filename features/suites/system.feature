Feature: Nemesis Core 4.0 Opaque Command Chit Director, Orbital Bastion Ledger, and System Topology

  @KZ-05 @build
  Scenario: The 5-Round Opaque Command Chit Director enforces Warden Chit return, 1d6 wrap-around selection, Boss chits, and 6 Doctrine AI routines
    Given the Opaque Command Chit Pool and WardenBerth count in NemesisChit.lex.tex
    When select_warden_berth, boss_activations, and select_doctrine_ai_action evaluate Warden draws
    Then 1d6 wrap-around selects 1..=N, ECH-3/ECH-4 contribute 2/3 chits, and all 6 Doctrines select their tactical AI routine

  @KZ-06 @build
  Scenario: The Orbital Bastion Campaign Ledger models 4 Pre-Drop Assignments, 3 Facilities, 6 Sector Contracts, and canonical FNV-1a save digests
    Given the Orbital Bastion campaign state in CampaignBastion.lex.tex
    When resolve_bastion_assignment and settle_vault_extraction execute pre-drop and post-drop settlement
    Then Scrap Alloy salvage caps at 6, XP awards to survivors, and a deterministic 32-bit FNV-1a save digest is produced

  @KZ-09 @build
  Scenario: The system topology in Architecture.lex.tex models 6 typed Nemesis Core 4.0 components, 8 directed edges, 7 features, and 4 journeys
    Given the compiled model.prism.json and Architecture.lex.tex
    When the system topology and feature-journey bindings are verified
    Then 6 components (component00..05), 8 edges (edge00..07), 7 features, and 4 journeys are present and traceable

  @KZ-16 @build
  Scenario: The 2.5D Object-Spatial Projection and Karst-9 World Catalog in SpatialWorld.lex.tex models 7 object kinds, 7 world locations, 4 presets, 9 minor directives, and isometric trajectory clearance
    Given the SpatialWorld.lex.tex specification and karst_kernel::spatial functions
    When compute_isometric_depth_key, evaluate_spatial_trajectory, and warden_force_for_threat execute
    Then painter depth keys order monotonically, unobstructed sector trajectories clear within MOV, and threat-tier Warden forces scale across Low, Medium, and High sectors

  @KZ-17 @build
  Scenario: The Deterministic Animation and Kinetic Choreography engine in AnimationEngine.lex.tex models 8 animation clips, 5 Chassis gaits, 6 Doctrine VFX profiles, parabolic arcs, and reduced-motion transitions
    Given the AnimationEngine.lex.tex specification and karst_kernel::animation functions
    When evaluate_quad_out_permille, evaluate_parabolic_arc_scaled, and sample_spatial_keyframe execute
    Then quadratic ease-out and parabolic hop curves evaluate deterministically and reduced-motion mode collapses immediately to the terminal frame
