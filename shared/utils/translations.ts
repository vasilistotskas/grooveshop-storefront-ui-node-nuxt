/** Media that shows something only when it has something to load: the attribute it loads from. */
const SOURCE_ATTRIBUTES: Readonly<Record<string, string>> = {
  img: 'src',
  iframe: 'src',
  embed: 'src',
  video: 'src',
  audio: 'src',
  source: 'src',
  object: 'data',
}
/** Elements with no end tag. */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
])
/** One token of markup: a comment or declaration, a tag (with its name and attribute text), or text. */
const MARKUP_TOKEN = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[^>]*>|<(\/?)([a-z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|[^<]+|</gi
const ATTRIBUTE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
/** TinyMCE writes an emptied paragraph as `<p>&nbsp;</p>`. */
const NBSP_ENTITY = /&(?:nbsp|#160|#x0*a0);/gi

/**
 * Whether a translated field is WRITTEN: it shows something — text, or
 * media with a source (a size chart can be a page) — rather than markup
 * alone. An editor saves an emptied rich-text field as `""`, `<p></p>` or
 * `<p>&nbsp;</p>`, and parler keeps the key, so a key is no evidence of a
 * document. An element with the `hidden` attribute shows nothing, nor does
 * its content, and an image or frame with no source loads nothing; inline
 * `svg` counts.
 *
 * The same rule as Django's `has_visible_content` (`core/utils/sanitize.py`),
 * which fills `ContentPage.translatedLocales`: change them together.
 */
export function hasVisibleContent(value: string | null | undefined): value is string {
  if (!value) return false
  // One flag per open element: whether it is hidden. Anything inside an
  // open hidden element is hidden too.
  const open: boolean[] = []
  for (const [token, closing, name, attributeText = ''] of value.matchAll(MARKUP_TOKEN)) {
    if (name === undefined) {
      const isMarkup = token.startsWith('<!') || token.startsWith('<?')
      if (!isMarkup && !open.some(Boolean) && token.replace(NBSP_ENTITY, ' ').trim() !== '') return true
      continue
    }
    const tag = name.toLowerCase()
    if (closing) {
      if (!VOID_ELEMENTS.has(tag)) open.pop()
      continue
    }
    const attributes = new Map<string, string>()
    for (const [, attribute, doubleQuoted, singleQuoted, bare] of attributeText.matchAll(ATTRIBUTE)) {
      attributes.set(attribute!.toLowerCase(), doubleQuoted ?? singleQuoted ?? bare ?? '')
    }
    const source = SOURCE_ATTRIBUTES[tag]
    if (!open.some(Boolean) && (tag === 'svg' || (source && (attributes.get(source) ?? '').trim() !== ''))) return true
    // `<x/>` opens and closes at once
    if (!VOID_ELEMENTS.has(tag) && !attributeText.trimEnd().endsWith('/')) open.push(attributes.has('hidden'))
  }
  return false
}

/**
 * The locales a row's `field` is written in, read from its parler
 * `translations` map — the one answer for every place that states a
 * page's languages (its hreflang set, the sitemap), so a blank
 * translation is left out everywhere rather than in some of them.
 */
export function translatedLocales(
  translations: Readonly<Record<string, Readonly<Record<string, unknown>> | null | undefined>> | null | undefined,
  field: string,
): string[] {
  return Object.entries(translations ?? {})
    .filter(([, translation]) => {
      const value = translation?.[field]
      return typeof value === 'string' && hasVisibleContent(value)
    })
    .map(([code]) => code)
}
