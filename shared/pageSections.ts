/**
 * Client-safe page-builder helpers.
 *
 * The per-section props contracts are the blocks' own Zod schemas
 * (``app/blocks``): a page's sections are validated and stripped by the
 * builder page route (``server/api/builder/pages/[pageKey].get.ts``, the
 * single producer of section data), so nothing here may import zod:
 * this file sits in the client's eager graph via the section Renderer,
 * and a zod import here shipped 67KB of minified zod to every visitor
 * (2026-08-29 eager-graph audit).
 */

/**
 * Section types that render the page's ``<h1>``.
 *
 * A page must expose exactly one h1. Most sections are repeatable
 * content blocks and top out at ``<h2>``, but a hero legitimately IS the
 * main heading of the page it leads. So a page that also carries its own
 * ``<PageTitle>`` has to stand down when the tenant's layout already
 * supplies one — otherwise the two compete, which is the duplicate-h1
 * defect the navbar logo used to cause site-wide.
 *
 * Together with `HEADING_FROM_PROPS` and `heroCarouselHeading` it is the one
 * place that records which components own the document heading.
 */
export const HEADING_SECTION_TYPES: ReadonlySet<string> = new Set([
  'hero_banner',
  // Its `heading` and `headingAccent` are the two lines of one h1.
  'hero_showcase',
  // Owns the whole contact page, heading included.
  'contact_panel',
])

/**
 * The heading sections that draw their h1 only when they have a heading
 * (`v-if` on the h1 in every design): an artwork-only hero, or one a merchant
 * just inserted, renders none, so it does not stand the page's own h1 down.
 */
const HEADING_FROM_PROPS: ReadonlySet<string> = new Set(['hero_banner', 'hero_showcase'])

interface SectionLike {
  componentType: string
  props?: unknown
}

const trimmedText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

/**
 * The heading of a hero carousel's FIRST slide — the page's h1 when it
 * has one.
 *
 * A carousel is not in `HEADING_SECTION_TYPES` because its type alone
 * does not decide: an editorial carousel renders its first slide's
 * heading as the h1 (the later slides' as h2s), while an artwork-only
 * one — the flat `images` form, or slides without copy — renders no
 * heading at all, and the page has to keep its own. (The webside
 * carousel reads only the flat form, which is what webside's
 * home hero is seeded with — Django's `BRAND_HOME_HERO_PROPS`.)
 */
export function heroCarouselHeading(props: unknown): string {
  const slides = (props as { slides?: unknown } | undefined)?.slides
  if (!Array.isArray(slides)) return ''
  return trimmedText((slides[0] as { heading?: unknown } | undefined)?.heading)
}

/** The heading a section draws from its props: `heading`, then `headingAccent`, its second line (one h1). */
function propsHeading(props: unknown): string {
  const { heading, headingAccent } = (props ?? {}) as { heading?: unknown, headingAccent?: unknown }
  return [trimmedText(heading), trimmedText(headingAccent)].filter(Boolean).join(' ')
}

const ownsHeading = (section: SectionLike): boolean => {
  if (section.componentType === 'hero_carousel') return heroCarouselHeading(section.props) !== ''
  if (!HEADING_SECTION_TYPES.has(section.componentType)) return false
  return !HEADING_FROM_PROPS.has(section.componentType) || propsHeading(section.props) !== ''
}

/** Whether a rendered section list already provides the page's h1. */
export function sectionsProvideHeading(
  sections: readonly SectionLike[] | undefined,
): boolean {
  return (sections ?? []).some(ownsHeading)
}

/**
 * The text of the heading a section list owns, for the page's `<title>`.
 *
 * A layout's admin label was NOT translatable, so a page's title tag
 * was one language for both locales — "Μητρώο έργων" on `/en/empeiria`, and "Eidikefsi"
 * (the slug, title-cased) on the pages whose layout predates its own
 * naming. The heading of the section that owns the `<h1>` is the same
 * text a reader sees at the top of the page, and it IS localised (a
 * section's props carry a per-locale override), so it is the better
 * title and needs no new model field.
 */
export function sectionsHeadingText(
  sections: readonly SectionLike[] | undefined,
): string | undefined {
  const owner = (sections ?? []).find(ownsHeading)
  if (!owner) return undefined
  if (owner.componentType === 'hero_carousel') return heroCarouselHeading(owner.props) || undefined
  // A heading drawn on two lines (`hero_showcase`'s accent line) is one h1, so one title.
  return propsHeading(owner.props) || undefined
}

/**
 * Section types that render a page's PRIMARY form.
 *
 * Same rule as the heading, one layer out: a page that ships a form of
 * its own has to stand down when the tenant's layout already carries
 * one, or the visitor is offered the same enquiry twice. `/contact` is
 * the only page this applies to today.
 */
export const FORM_SECTION_TYPES: ReadonlySet<string> = new Set([
  'contact_panel',
])

/** Whether a rendered section list already provides the page's form. */
export function sectionsProvideForm(
  sections: readonly { componentType: string }[] | undefined,
): boolean {
  return (sections ?? []).some(section =>
    FORM_SECTION_TYPES.has(section.componentType),
  )
}

/**
 * Whether a rendered section list already carries the opening hours (the
 * `business_hours` band), so the contact page does not print them a second
 * time in its card.
 */
export function sectionsProvideHours(
  sections: readonly { componentType: string }[] | undefined,
): boolean {
  return (sections ?? []).some(section => section.componentType === 'business_hours')
}

/**
 * Section types whose component is a full-width band in every design, its
 * own container inside (`PageSection/Band.vue`, the hero's section): the
 * band paints edge to edge and keeps the store's measure within. The base
 * shell stacks every section that way; a design whose shell holds its
 * sections in a container with a gap between them (webside's) lays these out
 * of it, edge to edge and with no gap, so a band is not framed twice.
 * `blog_categories` is one in its `tiles` layout only: its slider is drawn
 * bare in a design's own.
 */
export const BAND_SECTION_TYPES: ReadonlySet<string> = new Set([
  'hero_showcase',
  'store_assurances',
  'products_grid',
  'blog_posts_grid',
  'newsletter_signup',
])

/** Whether a section draws its own full-width band (`BAND_SECTION_TYPES`). */
export function sectionDrawsBand(section: SectionLike): boolean {
  if (section.componentType === 'blog_categories') {
    return (section.props as { layout?: unknown } | undefined)?.layout === 'tiles'
  }
  return BAND_SECTION_TYPES.has(section.componentType)
}

/**
 * A section list cut into runs of neighbours that draw their own band and
 * runs that do not, in order: what a shell that frames only the second kind
 * lays out.
 */
export function sectionRuns<T extends SectionLike>(
  sections: readonly T[],
): Array<{ bands: boolean, sections: T[] }> {
  const runs: Array<{ bands: boolean, sections: T[] }> = []
  for (const section of sections) {
    const bands = sectionDrawsBand(section)
    const last = runs.at(-1)
    if (last && last.bands === bands) last.sections.push(section)
    else runs.push({ bands, sections: [section] })
  }
  return runs
}
