Feature: Template Contract, Full Nemesis Core 4.0 Binding, and Release Profile

  @TC-01 @build
  Scenario: The Contract.lex.tex checker decides whether every universal policy and lock pin matches its expected SHA-256 digest
    Given the six pinned template policy and lock files in template-contract.json
    When the Contract.lex.tex conformant predicate and karst_kernel::conformant evaluate the observed SHA-256 digests
    Then identical pins return true and any drifted pin returns false

  @KZ-07 @build
  Scenario: The Nemesis Core 4.0 Engine Completeness specification proves that Karst: Zero Horizon binds and consumes all 5 subsystems
    Given the 5 Nemesis Core 4.0 engine subsystems in NemesisEngine.lex.tex and Application.lex.tex
    When verify_karst_nemesis_binding evaluates the engine binding across hologram:guest/core-wasm@1
    Then all 5 subsystems, 150 archetypes, 16 hardpoint modules, 6 contracts, and 5-round limits are verified

  @KZ-15 @build
  Scenario: The unified release profile binds 76 compiled facet entities, 17 verified LexLean v0.4 modules, and the Karst tactical application
    Given the compiled .prism/build/<digest>/model.prism.json and Main.lex.tex release profile
    When the release verification theorems and conformance gates inspect the holistic bundle
    Then all 76 facet entities and 17 LexLean v0.4 modules are present and verified
