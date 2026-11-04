Feature: WCAG 2.2 AA Certified Branding, sRGB Tokens, and Portal Presentation

  @KZ-12 @build
  Scenario: The branding and UI/UX facet in Presentation.lex.tex models 12 light/dark sRGB tokens, 10 WCAG 2.2 AA contrast pairs, 6 type steps, 6 spacing steps, and 4 portal pages
    Given the Presentation.lex.tex module and rendered view/ directory
    When meets_wcag_contrast_tenths and the branding conformance gate check the token pairs and portal pages
    Then all light and dark contrast pairs satisfy WCAG 2.2 AA and all 4 portal views are rendered
