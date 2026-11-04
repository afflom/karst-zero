Feature: ISO/IEC 27005 & 27034 Security, ISO/IEC 25010 Quality, and Normative Standards Profile

  @KZ-10 @build
  Scenario: The security, threat, and quality facets in Architecture.lex.tex model 4 assets, 4 threats, 4 risks, 4 controls, 4 activities, 4 measurements, and 4 quality measures
    Given the compiled security and quality sections in model.prism.json
    When the conformance suite checks asset, threat, risk, control, activity, measurement, and quality counts
    Then all 4 security chains and all 4 ISO/IEC 25010 quality measures pass verification

  @KZ-14 @build
  Scenario: The normative standards profile in Standards.lex.tex binds 6 standards with full coverage across panels, artifacts, journeys, navigations, visualizations, modules, and pages
    Given the Standards.lex.tex module and its coverage theorems
    When the standards coverage proofs are inspected
    Then all 6 standards cover every panel, artifact, journey, navigation, visualization, module, and portal page
