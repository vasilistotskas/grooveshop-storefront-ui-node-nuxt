/**
 * The picture on each card of the editor's add-section library: a schematic
 * of what the block lays out, one per block type, drawn from three tones so
 * it follows the editor's palette in light and dark (`Builder/Schematic.vue`):
 * a `frame` (an area: an image, a card), a `text` bar, an `accent` (a button,
 * a highlight). Shapes sit on a `BUILDER_SCHEMATIC_VIEW` canvas. Every block
 * the library offers has one (`test/unit/app/builder/schematics.spec.ts`).
 */
export type BuilderSchematicTone = 'frame' | 'text' | 'accent'

export interface BuilderSchematicShape {
  tone: BuilderSchematicTone
  x: number
  y: number
  width: number
  height: number
  /** Round ends: a pill, a dot. */
  round?: boolean
}

/** The schematic canvas, in its own units. */
export const BUILDER_SCHEMATIC_VIEW = { width: 120, height: 80 } as const

const shape = (tone: BuilderSchematicTone, x: number, y: number, width: number, height: number, round = false): BuilderSchematicShape =>
  ({ tone, x, y, width, height, ...(round && { round }) })

const frame = (x: number, y: number, width: number, height: number) => shape('frame', x, y, width, height)
const text = (x: number, y: number, width: number, height = 4) => shape('text', x, y, width, height, true)
const accent = (x: number, y: number, width: number, height = 8) => shape('accent', x, y, width, height, true)

/** A heading and, under it, `lines` lines of text, left-aligned at `x`. */
const copy = (x: number, y: number, width: number, lines = 2) => [
  text(x, y, width * 0.7, 6),
  ...Array.from({ length: lines }, (_, line) => text(x, y + 11 + line * 7, width - line * 8)),
]

/** A row of `count` cards of the same size, each a frame with a line under it. */
const cards = (y: number, count: number, height = 30, withText = true) => {
  const gap = 6
  const width = (108 - gap * (count - 1)) / count
  return Array.from({ length: count }, (_, card) => [
    frame(6 + card * (width + gap), y, width, height),
    ...(withText ? [text(6 + card * (width + gap), y + height + 4, width * 0.8)] : []),
  ]).flat()
}

/** A heading row over a band: a title on the left, a link on the right. */
const bandHeading = (y = 8) => [text(6, y, 46, 6), text(90, y + 1, 24)]

const heroBanner = [frame(0, 0, 120, 80), ...copy(10, 22, 60), accent(10, 58, 30)]
const productRow = (count: number) => [...bandHeading(), ...cards(22, count, 32)]

export const BUILDER_SCHEMATICS: Readonly<Record<string, readonly BuilderSchematicShape[]>> = {
  // Heroes
  hero_banner: heroBanner,
  hero_carousel: [...heroBanner, shape('accent', 52, 72, 4, 4, true), shape('text', 60, 72, 4, 4, true), shape('text', 68, 72, 4, 4, true)],
  loyalty_hero: [frame(0, 0, 120, 80), ...copy(10, 16, 56), accent(10, 54, 30), frame(76, 16, 34, 44)],
  // Text, search and buttons on the left; the picture over a product card on the right.
  hero_showcase: [...copy(8, 14, 48), frame(8, 40, 48, 10), accent(8, 56, 22), shape('frame', 34, 56, 22, 8, true), frame(64, 10, 50, 26), frame(64, 42, 50, 28), accent(96, 60, 14, 6)],

  // Products
  featured_products: productRow(3),
  products_grid: [...bandHeading(), ...cards(22, 4, 20, false), ...cards(48, 4, 20, false)],
  products_slider: [...productRow(4), shape('accent', 108, 34, 8, 8, true)],
  product_categories: [...bandHeading(), ...cards(22, 3, 40)],
  recently_viewed: [...bandHeading(), ...cards(22, 5, 26)],
  offers_preview: [...bandHeading(), frame(6, 22, 51, 46), frame(63, 22, 51, 46), accent(12, 56, 22), accent(69, 56, 22)],
  search_bar: [frame(14, 30, 92, 20), text(22, 38, 50), accent(88, 34, 12, 12)],

  // Content
  rich_text: copy(10, 14, 100, 6),
  media_text: [frame(6, 10, 50, 60), ...copy(64, 18, 50, 3), accent(64, 56, 26)],
  about_content: [...copy(10, 10, 100, 3), frame(10, 46, 100, 28)],
  vision_content: [text(30, 14, 60, 6), ...Array.from({ length: 3 }, (_, line) => text(20 + line * 4, 28 + line * 8, 80 - line * 8)), accent(46, 60, 28)],
  what_is_microlearning: [...copy(10, 10, 60, 3), frame(76, 10, 36, 36), ...cards(52, 3, 18, false)],
  why_microlearning: [text(10, 8, 60, 6), ...cards(22, 3, 22), ...cards(56, 3, 10, false)],
  pull_quote: [shape('accent', 12, 18, 10, 10, true), text(28, 22, 80, 6), text(28, 34, 70, 6), text(28, 50, 34)],
  story_timeline: [text(6, 6, 46, 6), frame(58, 18, 4, 58), ...[20, 40, 60].flatMap(y => [shape('accent', 56, y, 8, 8, true), text(70, y + 2, 40), text(14, y + 2, 36)])],
  faq: [text(6, 6, 50, 6), ...[20, 34, 48, 62].flatMap(y => [frame(6, y, 108, 10), text(10, y + 3, 60), shape('text', 104, y + 3, 4, 4, true)])],
  features_grid: [text(30, 6, 60, 6), ...[0, 1, 2].flatMap(column => [shape('accent', 14 + column * 36, 24, 12, 12, true), text(10 + column * 36, 42, 26), text(10 + column * 36, 50, 22)])],
  image_gallery: [frame(6, 6, 52, 34), frame(62, 6, 52, 34), frame(6, 44, 34, 30), frame(44, 44, 34, 30), frame(82, 44, 32, 30)],

  // Trust
  testimonials: [text(6, 6, 50, 6), ...cards(20, 3, 44, false), ...[0, 1, 2].flatMap(card => [text(12 + card * 38, 28, 24), text(12 + card * 38, 36, 20), shape('accent', 12 + card * 38, 52, 8, 8, true)])],
  trust_badges: [frame(6, 30, 108, 20), ...[0, 1, 2, 3].flatMap(badge => [shape('accent', 12 + badge * 27, 36, 8, 8, true), text(23 + badge * 27, 38, 14)])],
  stats_strip: [...[0, 1, 2].flatMap(column => [text(10 + column * 36, 28, 24, 10), text(10 + column * 36, 44, 30)])],
  partner_strip: [text(30, 14, 60, 5), ...[0, 1, 2, 3, 4].map(logo => frame(6 + logo * 22.5, 34, 18, 14))],

  // Blog
  blog_posts_grid: [...bandHeading(), ...cards(22, 3, 30), text(6, 66, 30), text(44, 66, 30), text(82, 66, 30)],
  blog_posts_list: [text(6, 6, 50, 6), ...[18, 38, 58].flatMap(y => [frame(6, y, 30, 16), text(42, y + 2, 60), text(42, y + 10, 46)])],
  blog_posts_carousel: [...bandHeading(), ...cards(22, 3, 36), shape('accent', 108, 36, 8, 8, true)],
  blog_categories: [text(6, 8, 50, 6), ...[0, 1, 2, 3].map(chip => accent(6 + chip * 27, 26, 23)), ...[0, 1, 2].map(chip => shape('text', 6 + chip * 27, 40, 23, 8, true))],

  // Store
  contact_panel: [...copy(6, 10, 50, 3), frame(64, 10, 50, 60), text(70, 18, 36), text(70, 30, 36), accent(70, 56, 30)],
  business_hours: [text(6, 8, 50, 6), ...[22, 32, 42, 52, 62].flatMap(y => [text(10, y, 30), text(80, y, 26)])],
  location_map: [frame(0, 0, 120, 80), shape('accent', 56, 30, 10, 10, true), frame(8, 52, 44, 20)],
  newsletter_signup: [text(30, 18, 60, 6), text(22, 30, 76), frame(20, 46, 56, 12), accent(80, 46, 20, 12)],
  cta_banner: [frame(6, 16, 108, 48), text(16, 30, 56, 6), text(16, 42, 44), accent(84, 34, 22, 12)],

  // Layout
  divider: [frame(10, 39, 100, 2)],
  spacer: [shape('text', 56, 14, 8, 8, true), frame(59, 26, 2, 28), shape('text', 56, 58, 8, 8, true)],

  // Navigation
  header_menu: [frame(0, 26, 120, 28), text(8, 37, 24, 6), text(44, 38, 14), text(62, 38, 14), text(80, 38, 14), shape('accent', 104, 36, 8, 8, true)],
  footer_menu: [frame(0, 10, 120, 70), ...[0, 1, 2].flatMap(column => [text(10 + column * 36, 20, 24, 5), text(10 + column * 36, 32, 20), text(10 + column * 36, 40, 22), text(10 + column * 36, 48, 18)])],
  mobile_menu: [frame(34, 4, 52, 72), ...[14, 26, 38, 50].map(y => text(42, y, 34)), accent(42, 62, 28)],

  // Blocks inside a section
  bullet: [shape('accent', 20, 36, 8, 8, true), text(34, 38, 66)],
  faq_item: [frame(10, 24, 100, 14), text(16, 29, 60), shape('text', 98, 29, 6, 4, true), text(16, 46, 80), text(16, 54, 64)],
  feature_item: [shape('accent', 50, 14, 20, 20, true), text(36, 42, 48, 6), text(30, 54, 60)],
  footer_column: [text(30, 14, 40, 6), text(30, 28, 50), text(30, 38, 44), text(30, 48, 52)],
  nav_link: [text(30, 34, 46, 6), shape('text', 82, 34, 8, 6, true)],
  partner: [frame(30, 22, 60, 36)],
  spec_card: [frame(20, 8, 80, 64), text(28, 16, 40, 6), ...[30, 42, 54].flatMap(y => [text(28, y, 24), text(64, y, 28)])],
  spec_row: [text(14, 36, 40), text(70, 36, 36)],
  stat: [text(38, 26, 44, 12), text(30, 46, 60)],
  testimonial: [frame(14, 10, 92, 60), text(22, 20, 72), text(22, 30, 64), shape('accent', 22, 52, 10, 10, true), text(38, 54, 36)],
  timeline_entry: [shape('accent', 18, 34, 10, 10, true), text(36, 32, 56, 6), text(36, 44, 46)],
  trust_badge: [shape('accent', 34, 34, 12, 12, true), text(52, 38, 34)],
}
