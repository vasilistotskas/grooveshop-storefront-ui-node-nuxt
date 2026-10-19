import type { TenantFonts } from './themeTokens'

/**
 * Which `@font-face` rules a page keeps.
 *
 * `@nuxt/fonts` declares every pre-bundled family (`global: true` in
 * `nuxt.config.ts`) because the tenant picks its faces at runtime, and
 * hoists the declarations into an inline `<style>` in every document:
 * 204 faces of 17 families, 76 KB in every page's head, when one store
 * sets two or three families. `server/plugins/tenant-fonts.ts` drops the
 * rest per request with these helpers.
 *
 * Only the selectable families (`FONT_FAMILY_NAMES`) are ever dropped,
 * with their `"<Family> Fallback: <font>"` metric faces; a face of any
 * other family is not ours to judge and stays.
 */

const FONT_FACE_RE = /@font-face\s*\{[^}]*\}/g
const FAMILY_DECLARATION_RE = /font-family\s*:\s*([^;}]+)/
const CSS_ESCAPE_RE = /\\(?:([0-9a-f]{1,6})\s?|(.))/gi
const FALLBACK_SUFFIX_RE = / Fallback: .*$/s

const SELECTABLE_FAMILIES = new Set(Object.values(FONT_FAMILY_NAMES))

/** The family a minified `@font-face` rule declares, unquoted and unescaped. */
function declaredFamily(rule: string): string | undefined {
  const value = FAMILY_DECLARATION_RE.exec(rule)?.[1]?.trim()
  if (!value) return undefined
  return value
    .replace(/^(["'])(.*)\1$/s, '$2')
    .replace(CSS_ESCAPE_RE, (_escape, hex: string | undefined, char: string | undefined) =>
      hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : char!)
}

/** The family names behind the tenant's resolved faces. */
export function tenantFontFamilies(fonts: TenantFonts): Set<string> {
  const families = new Set<string>()
  for (const key of [fonts.sans, fonts.display, fonts.mono]) {
    const name = key ? FONT_FAMILY_NAMES[key] : undefined
    if (name) families.add(name)
  }
  return families
}

/**
 * `chunk` (a rendered head chunk) without the `@font-face` rules of
 * selectable families outside `keep`.
 */
function keepFontFaces(chunk: string, keep: ReadonlySet<string>): string {
  if (!chunk.includes('@font-face')) return chunk
  return chunk.replace(FONT_FACE_RE, (rule) => {
    const family = declaredFamily(rule)?.replace(FALLBACK_SUFFIX_RE, '')
    return family && SELECTABLE_FAMILIES.has(family) && !keep.has(family) ? '' : rule
  })
}

/**
 * The head chunk `@nuxt/fonts` pushes, `<style>${faces}</style>`, once
 * every face in it is dropped.
 */
const EMPTIED_FONT_STYLE = '<style></style>'

/**
 * `head` (the rendered head chunks) with only the faces in `keep` among
 * the selectable families. A chunk left as an empty `<style>` is dropped
 * whole: chunks are compared, never cut out of markup.
 */
export function keepHeadFontFaces(head: string[], keep: ReadonlySet<string>): string[] {
  return head
    .map(chunk => keepFontFaces(chunk, keep))
    .filter(chunk => chunk !== EMPTIED_FONT_STYLE)
}
