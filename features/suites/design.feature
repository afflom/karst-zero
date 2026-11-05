Feature: ISO/PAS 19450 OPM and OMG UML 2.5.1 Design Views

  @KZ-11 @build
  Scenario: The design facet in Design.lex.tex models 12 system processes, 10 system states, 3 ISO/PAS 19450 OPM views (.opl), and 4 OMG UML 2.5.1 views (.puml)
    Given the Design.lex.tex specification and compiled .prism/build/<digest>/design/ directory
    When the design conformance test inspects the generated diagrams
    Then all 3 OPM .opl files and 4 PlantUML .puml files exist and match the system topology
