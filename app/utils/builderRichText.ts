/**
 * The page editor's rich text: what counts as nothing written, and which
 * link addresses it takes.
 */

/** Markup that holds something with no text of its own. */
const CONTENT_WITHOUT_TEXT = /<(?:hr|img|iframe)\b/i

/**
 * Whether the HTML holds nothing a shopper would see: an emptied editor
 * still writes an empty paragraph (`<p></p>`), which is no text.
 */
export function builderRichTextIsEmpty(html: string): boolean {
  if (CONTENT_WITHOUT_TEXT.test(html)) return false
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\u00A0/g, '').trim() === ''
}

/**
 * Whether a link in rich text may go to `href`: an `https://` address, or a
 * path of the store itself (`/products`), never a protocol-relative `//host`
 * or a `javascript:` URL, which the store's sanitiser would refuse.
 */
export function builderRichTextLinkAllowed(href: string): boolean {
  return /^https:\/\/[^\s/]+/.test(href) || /^\/(?!\/)\S*$/.test(href)
}
