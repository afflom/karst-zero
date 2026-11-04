Feature: Nemesis Core 4.0 3D Unit Synthesis, Progression, Combat Engine, and Resonance Weave

  @KZ-01 @build
  Scenario: The Nemesis Core 4.0 3D Unit Synthesis matrix compiles all 150 [Doctrine x Chassis x Echelon] archetypes and enforces the 6-Berth / 16-Alloy charter
    Given the 6 Combat Doctrines, 5 Chassis Types, and 5 Echelon Tiers in UnitSynthesis.lex.tex
    When compile_unit_archetype and validate_strike_roster evaluate unit coordinates and roster alloy costs
    Then all 150 archetypes synthesize deterministically and rosters up to 6 Berths and 16 Alloy pass charter validation

  @KZ-02 @build
  Scenario: Horizontal Progression and Permadeath enforce Zero-Stat-Inflation, 3-XP Hardpoint Socket unlocks, and Zero-Stat Permadeath
    Given an operative with base Hardpoint Sockets and accumulated campaign XP in UnitSynthesis.lex.tex
    When compute_unlocked_sockets and check_permadeath evaluate progression and post-battle vitality
    Then every 3 XP unlocks 1 Hardpoint Socket (up to +2) with zero base-stat inflation and 0 HP/MOV/EVA triggers permadeath

  @KZ-03 @build
  Scenario: The Unified d6 Strike Pool resolves opposed rolls, Momentum Charge, Cover, Mitigation, Subsystem Rupture, and Fireteam spillover
    Given attacker and defender d6 pools, cover states, and armor/resilience in CombatEngine.lex.tex
    When resolve_opposed_strike, resolve_subsystem_rupture, and resolve_fireteam_spillover execute
    Then hits, Bulkhead LoS blocks, Barricade +1 auto-EVA, Automaton 1d6 Rupture, and Fireteam casualties resolve deterministically

  @KZ-04 @build
  Scenario: The Resonance Weave engine models 6 Resonance Frequencies, 16 Hardpoint Modules, Harmonic Ranks, and Psionic Backlash
    Given the 6 Resonance Frequencies and 16 Hardpoint Modules in ResonanceWeave.lex.tex
    When evaluate_resonance_weave inspects caster Echelon and Weave d6 rolls
    Then Harmonic Rank equals Echelon - 1, Minor/Major Harmonics trigger at 1+/2+ successes, and double-1s trigger Backlash
