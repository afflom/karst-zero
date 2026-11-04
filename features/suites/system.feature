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
  Scenario: The system topology in Architecture.lex.tex models 6 typed Nemesis Core 4.0 components, 8 directed edges, 6 features, and 4 journeys
    Given the compiled model.prism.json and Architecture.lex.tex
    When the system topology and feature-journey bindings are verified
    Then 6 components (component00..05), 8 edges (edge00..07), 6 features, and 4 journeys are present and traceable
