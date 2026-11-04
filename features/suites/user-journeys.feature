Feature: Progressive 5-Pole Stakeholder Journeys and WAI-ARIA Navigation

  @KZ-13 @build
  Scenario: The user-journey facet in Presentation.lex.tex models 4 progressive 5-pole journeys, WAI-ARIA navigation patterns, and pedagogy guides
    Given the Presentation.lex.tex and Architecture.lex.tex journey definitions
    When the user-journeys conformance gate inspects the 20 journey steps and WAI-ARIA navigation landmarks
    Then every stakeholder journey walks all 5 observer poles and resolves with a verification proof witness
