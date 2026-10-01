export interface LegalTocLink {
  id: string
  text: string
}

export interface LegalTocResult {
  /** The body, with an id guaranteed on every heading the TOC lists. */
  html: string
  links: LegalTocLink[]
}

// `id` as an attribute of its own — `\bid=` also matched inside `data-id=`,
// since `-` is a word boundary; attributes are whitespace-separated — and
// its value however HTML lets it be written: double-quoted, single-quoted
// or bare, with optional spaces around `=`.
const ID_VALUE = String.raw`id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))`
const SECTION_WITH_ID = new RegExp(String.raw`<section\b[^>]*?\s${ID_VALUE}[^>]*>`, 'gi')
const HEADING = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi
const ID_ATTR = new RegExp(String.raw`(?:^|\s)${ID_VALUE}`, 'i')
const ANY_ID = new RegExp(String.raw`\s${ID_VALUE}`, 'gi')

/** The id an `ID_VALUE` match captured, in whichever quoting it used. */
const idOf = (match: RegExpMatchArray | RegExpExecArray | null | undefined) =>
  match ? (match[1] ?? match[2] ?? match[3]) : undefined

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': '\'',
  '&nbsp;': ' ',
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Derive a legal page's table of contents from the document itself.
 *
 * The three legal routes used to carry a hardcoded `tocLinks` array
 * each, listing the ids of the boilerplate that was compiled into them.
 * The moment a tenant published its own page the article changed but the
 * array did not, so the sidebar advertised anchors that existed nowhere
 * on the page — four dead links on tenant #2's `/privacy-policy`, and a
 * scroll-spy that silently did nothing because `IntersectionObserver`
 * found no targets to observe.
 *
 * A document's contents can only come from the document. Headings are
 * read in order and matched to an anchor, preferring what the author
 * already wrote:
 *
 * 1. an `id` on the heading itself,
 * 2. otherwise the `id` of the `<section>` it opens — the shape the
 *    seeded documents use, so their anchors stay exactly what they were,
 * 3. otherwise a generated `section-N`, which is INJECTED into the
 *    returned html so the link it produces always has a target.
 *
 * Every link gets a target of its own: an anchor another link already
 * uses — two headings with one id, a heading reusing a section's — is
 * replaced by a generated one, and a generated one never repeats an id
 * the document already carries (`section-N-2` then), or the link would
 * jump to whichever element with that id came first. `N` stays the
 * heading's position, so the anchors of an unchanged document do not
 * move.
 *
 * Case 3 is what makes this safe for merchant-written HTML: a merchant
 * typing headings into TinyMCE gets a working jump list without knowing
 * anchors exist. A document with no headings yields no links, and
 * `LegalToc` renders nothing rather than an empty box.
 *
 * Pure string work on purpose — this runs during SSR, where there is no
 * DOM, and the links must be in the server-rendered HTML rather than
 * appearing after hydration.
 */
export function buildLegalToc(html: string): LegalTocResult {
  if (!html) return { html: '', links: [] }

  type Token
    = | { kind: 'section', index: number, id: string }
      | { kind: 'heading', index: number, match: string, attrs: string, inner: string }

  const tokens: Token[] = []
  for (const m of html.matchAll(SECTION_WITH_ID)) {
    tokens.push({ kind: 'section', index: m.index ?? 0, id: idOf(m) ?? '' })
  }
  for (const m of html.matchAll(HEADING)) {
    tokens.push({
      kind: 'heading',
      index: m.index ?? 0,
      match: m[0],
      attrs: m[1] ?? '',
      inner: m[2] ?? '',
    })
  }
  tokens.sort((a, b) => a.index - b.index)

  const links: LegalTocLink[] = []
  const injections: { index: number, from: string, to: string }[] = []
  let openSectionId: string | null = null
  let generated = 0
  // Every id in the document, and those a link already points at.
  const taken = new Set([...html.matchAll(ANY_ID)].map(m => idOf(m) ?? ''))
  const linked = new Set<string>()
  const freshId = (position: number) => {
    let id = `section-${position}`
    for (let suffix = 2; taken.has(id); suffix++) id = `section-${position}-${suffix}`
    taken.add(id)
    return id
  }

  for (const token of tokens) {
    if (token.kind === 'section') {
      openSectionId = token.id || null
      continue
    }

    const text = plainText(token.inner)
    if (!text) continue

    generated += 1
    const ownId = idOf(ID_ATTR.exec(token.attrs))
    let id = ownId || openSectionId || ''

    if (!id || linked.has(id)) {
      id = freshId(generated)
      injections.push({
        index: token.index,
        from: token.match,
        // Replaces a duplicate id of the heading's own rather than
        // adding a second `id` attribute beside it.
        to: `<h2${token.attrs.replace(ID_ATTR, '')} id="${id}">${token.inner}</h2>`,
      })
    }

    linked.add(id)
    links.push({ id, text })
    // A section's id belongs to the first heading inside it; a second
    // heading in the same section needs an anchor of its own.
    openSectionId = null
  }

  let out = html
  // Apply back-to-front so earlier indices stay valid.
  for (const injection of injections.sort((a, b) => b.index - a.index)) {
    out
      = out.slice(0, injection.index)
        + injection.to
        + out.slice(injection.index + injection.from.length)
  }

  return { html: out, links }
}
