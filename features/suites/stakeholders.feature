Feature: ISO/IEC/IEEE 42010 Stakeholders, Concerns, Viewpoints, and Views

  @KZ-08 @build
  Scenario: The ISO/IEC/IEEE 42010 architecture facet models 4 stakeholders, 7 concerns, 7 viewpoints, 7 views, and 5 ISO standards
    Given the Architecture.lex.tex specification and compiled model.prism.json
    When the architecture facet is inspected by the conformance suite
    Then 4 stakeholders, 7 concerns, 7 viewpoints, 7 views, and 5 ISO standards are aligned with observer quadruples
