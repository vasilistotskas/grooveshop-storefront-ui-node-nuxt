/** The page editor's rich text: which link addresses it takes. */

/**
 * Whether a link in rich text may go to `href`: an `https://` address, or a
 * path of the store itself (`/products`), never a protocol-relative `//host`
 * or a `javascript:` URL, which the store's sanitiser would refuse.
 */
export function builderRichTextLinkAllowed(href: string): boolean {
  return /^https:\/\/[^\s/]+/.test(href) || /^\/(?!\/)\S*$/.test(href)
}
