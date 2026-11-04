Feature: ISO/PAS 19450 OPM and OMG UML 2.5.1 Design Views

  @KZ-11 @build
  Scenario: The design facet in Design.lex.tex models 9 system processes, 6 system states, 2 ISO/PAS 19450 OPM views (.opl), and 3 OMG UML 2.5.1 views (.puml)
    Given the Design.lex.tex specification and compiled .prism/build/<digest>/design/ directory
    When the design conformance test inspects the generated diagrams
    Then all 2 OPM .opl files and 3 PlantUML .puml files exist and match the system topology
