# Karst: Zero Horizon — Nemesis Core 4.0 Game Engine

**Karst: Zero Horizon** is a tactical orbital-drop skirmish and solo/co-op campaign wargame powered by the **Nemesis Core 4.0** game engine, authored and verified on **UOR Template (`uor.template-contract/1`)**, **PrismPM v0.4**, and **LexLean v0.4**.

- **Live GitHub Pages Application**: https://afflom.github.io/karst-zero/
- **Repository**: https://github.com/afflom/karst-zero

## Architecture & Full Nemesis Core 4.0 Engine Realization

Every subsystem of the **Nemesis Core 4.0** game engine is specified in closed-lexicon **LexLean v0.4** (`src/*.lex.tex`), compiled by **PrismPM v0.4** into `.prism/build/<digest>/model.prism.json` and ISO/PAS 19450 OPM (`.opl`) / OMG UML 2.5.1 (`.puml`) design views, realized in the `#![no_std]` `#![forbid(unsafe_code)]` Rust kernel (`crates/karst-kernel`), and consumed by the interactive **Karst: Zero Horizon** client (`src/game/nemesisEngine.ts`, `src/lib/karstHoloModel.ts`):

1. **Subsystem 1 — 3D Unit Synthesis & Zero-Stat-Inflation (`src/UnitSynthesis.lex.tex`, `KZ-01`, `KZ-02`)**:
   - Synthesizes all `6 x 5 x 5 = 150` archetypes across `[Doctrine (Breacher, Aegis, Outrider, Deadeye, Saboteur, Psion) x Chassis (Spliced, Automaton, Xenomorph, PhaseBorn, RigWalker) x Echelon (ECH-0..ECH-4)]`.
   - Enforces the **6-Berth / 16-Alloy Charter**, **Zero-Stat-Inflation** (XP never inflates base attribute dice), **`3-XP` Hardpoint Socket Unlocks** (`xp / 3`), and **Zero-Stat Permadeath**.
2. **Subsystem 2 — Unified d6 Strike Pool, Cover & Subsystem Rupture (`src/CombatEngine.lex.tex`, `KZ-03`)**:
   - Opposed `4+` Strike Pool, Critical `6`s, 4-sector Momentum Charges (`+1` hit/die), Low Barricade Partial Cover (`+1` auto-EVA), Solid Bulkhead LoS blocking, Reinforced Plating (`ARM`) & Bio-Resilience (`TGH`) mitigation, Automaton `1d6` Subsystem Rupture table, and Fireteam (`ECH-0` & `ECH-1`) casualty spillover.
3. **Subsystem 3 — 6-Frequency Resonance Weave & Hardpoint Ordnance (`src/ResonanceWeave.lex.tex`, `KZ-04`)**:
   - 6 Resonance Frequencies (`FerroKinetics`, `PlasmaArc`, `BioSynth`, `NeuroHacking`, `FoldSpace`, `ChronoDrift`), 16 Hardpoint Modules (`12` 1-Hardpoint at 3 Alloy + `4` 2-Hardpoint Masterwork at 6 Alloy), Harmonic Rank (`Echelon - 1`), Minor/Major Harmonics, and the 6-entry Psionic Backlash table.
4. **Subsystem 4 — 5-Round Opaque Command Chit Pool & Doctrine AI (`src/NemesisChit.lex.tex`, `KZ-05`)**:
   - 5-Round drop limit, Opaque Command Chit Pool with returning Warden Directive Chits, `1d6` Warden Berth wrap-around selector (`((d6 - 1) mod N) + 1`), Multi-Berth Boss activations (`ECH-3 = 2`, `ECH-4 = 3`), and 6 deterministic Doctrine AI routines.
5. **Subsystem 5 — Orbital Bastion Campaign Ledger & Full Engine Binding (`src/CampaignBastion.lex.tex`, `src/NemesisEngine.lex.tex`, `KZ-06`, `KZ-07`)**:
   - 4 Pre-Drop Crew Assignments (`SectorRecon`, `ScrapSalvaging`, `MedBayOverhaul`, `CombatSimDrill`), 3 Orbital Bastion Facilities, 6 Core Sector Contracts, 6-Alloy salvage cap, canonical FNV-1a / BLAKE3 save digests, and full engine binding theorem `NemesisEngine::karstConsumesFullNemesisCore4Engine`.
6. **Subsystem 6 — 2.5D Object-Spatial Projection & Karst-9 World Catalog (`src/SpatialWorld.lex.tex`, `KZ-16`)**:
   - 2 Camera Modes (`isometric_2_5d` and `top_down_2d`), 7 Spatial Object Categories (`CarrierRoomNode`, `DropBerthNode`, `PlanetarySectorNode`, `CavernFloorTile`, `TerrainStructure`, `ObjectiveArtifact`, `CharacterUnit`), 7 Karst-9 World Locations (`1` Orbital Bastion + `6` Vault Sectors), 4 Starting Company Presets, 9 Minor Resonance Directives, 3 Threat-Tier Warden Force Profiles, and monotonic painter's depth sorting (`(x + y) * 100 + y + z * 10`).

## Verification & Build Commands

```bash
cargo fmt --all -- --check
cargo run -p xtask -- render-view
cargo run -p xtask -- validate
cargo test --workspace --all-targets
```

