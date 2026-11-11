/**
 * The class that draws a band in its colour scheme: Nuxt UI's own `light` or
 * `dark` subtree switch, which every token inside follows with the store's
 * colours (`main.css` and `themeCss` write each scheme for a part of the
 * page). `auto`, or no scheme, is no class: the band follows the page.
 */
export function colorSchemeClass(scheme: SectionColorScheme | undefined): 'light' | 'dark' | undefined {
  return scheme === 'light' || scheme === 'dark' ? scheme : undefined
}
