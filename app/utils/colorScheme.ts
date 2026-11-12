/**
 * The classes that draw a band in its colour scheme: Nuxt UI's own `light` or
 * `dark` subtree switch, which every token inside follows with the store's
 * colours (`main.css` and `themeCss` write each scheme for a part of the
 * page), and the scheme's text colour. The text colour is set on the band
 * itself because `body` paints it in the PAGE's scheme, and text inside the
 * band with no colour utility of its own would inherit that: dark on dark in
 * a dark band on a light page. The ground is the band's own surface. No
 * scheme is no class: the band follows the page.
 */
export function colorSchemeClass(scheme: SectionColorScheme | undefined): string | undefined {
  return scheme ? `${scheme} text-default` : undefined
}
