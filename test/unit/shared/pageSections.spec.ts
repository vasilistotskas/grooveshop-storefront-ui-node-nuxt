import { describe, it, expect } from 'vitest'
import {
  HEADING_SECTION_TYPES,
  sectionRuns,
  sectionsHeadingText,
  sectionsProvideForm,
  sectionsProvideHours,
  sectionsProvideHeading,
} from '~~/shared/pageSections'

/**
 * Which section owns a page's h1, which owns its form, and what the
 * page's `<title>` should say. All three are page-level questions
 * answered from the section list, and getting the first one wrong cost
 * the homepage its h1 and `/contact` a second one.
 */
describe('pageSections', () => {
  it('knows the section types that own a page heading', () => {
    expect([...HEADING_SECTION_TYPES].sort()).toEqual([
      'contact_panel',
      'hero_banner',
      'hero_showcase',
    ])
  })

  it('reports a heading only when one of those is present', () => {
    expect(sectionsProvideHeading([{ componentType: 'hero_banner', props: { heading: 'Charge fast' } }])).toBe(true)
    expect(sectionsProvideHeading([{ componentType: 'contact_panel' }])).toBe(true)
    expect(sectionsProvideHeading([{ componentType: 'rich_text', props: { heading: 'Not an h1' } }])).toBe(false)
    expect(sectionsProvideHeading(undefined)).toBe(false)
  })

  // The heroes draw their h1 only with a heading (`v-if` on it): a hero
  // the merchant just inserted (the showcase preset is a search and a
  // picture) or one of artwork only leaves the page its own h1.
  it.each(['hero_banner', 'hero_showcase'])('counts a %s only when it has a heading', (componentType) => {
    const hero = (props?: Record<string, string>) => [{ componentType, props }]

    expect(sectionsProvideHeading(hero({ heading: 'Step into' }))).toBe(true)
    expect(sectionsProvideHeading(hero())).toBe(false)
    expect(sectionsProvideHeading(hero({ heading: '  ', subheading: 'Not the h1' }))).toBe(false)
  })

  it('counts a showcase whose heading is only its accent line', () => {
    expect(sectionsProvideHeading([{ componentType: 'hero_showcase', props: { headingAccent: 'technology' } }])).toBe(true)
  })

  it('takes the title from the first hero that draws a heading', () => {
    expect(sectionsHeadingText([
      { componentType: 'hero_showcase', props: { showSearch: 'true' } },
      { componentType: 'hero_banner', props: { heading: 'Charge fast' } },
    ])).toBe('Charge fast')
  })

  it('counts a hero carousel only when its first slide has a heading', () => {
    const carousel = (props: unknown) => [{ componentType: 'hero_carousel', props }]

    expect(sectionsProvideHeading(carousel({ slides: [{ imageUrl: '/a.jpg', heading: 'Charge fast' }] })))
      .toBe(true)
    // Artwork only: the flat form, a slide without copy, a blank heading,
    // or a heading on a LATER slide (rendered as an h2) owns no h1.
    expect(sectionsProvideHeading(carousel({ images: ['/a.jpg'] }))).toBe(false)
    expect(sectionsProvideHeading(carousel({ slides: [{ imageUrl: '/a.jpg' }] }))).toBe(false)
    expect(sectionsProvideHeading(carousel({ slides: [{ imageUrl: '/a.jpg', heading: '  ' }] }))).toBe(false)
    expect(sectionsProvideHeading(carousel({
      slides: [{ imageUrl: '/a.jpg' }, { imageUrl: '/b.jpg', heading: 'Second' }],
    }))).toBe(false)
  })

  it('takes the page title from a hero carousel\'s first slide', () => {
    expect(sectionsHeadingText([
      { componentType: 'trust_badges', props: { heading: 'Not this one' } },
      { componentType: 'hero_carousel', props: { slides: [{ imageUrl: '/a.jpg', heading: ' Charge fast ' }] } },
    ])).toBe('Charge fast')
  })

  it('reports a form only for the section that carries one', () => {
    expect(sectionsProvideForm([{ componentType: 'contact_panel' }])).toBe(true)
    expect(sectionsProvideForm([{ componentType: 'hero_banner' }])).toBe(false)
  })

  it('reports opening hours only for the business_hours band', () => {
    expect(sectionsProvideHours([{ componentType: 'business_hours' }])).toBe(true)
    expect(sectionsProvideHours([{ componentType: 'contact_panel' }])).toBe(false)
    expect(sectionsProvideHours(undefined)).toBe(false)
  })

  it('takes the page title from the section that owns the heading', () => {
    const sections = [
      { componentType: 'partner_strip', props: { heading: 'Not this one' } },
      { componentType: 'hero_banner', props: { heading: 'Project register' } },
      { componentType: 'cta_banner', props: { heading: 'Nor this' } },
    ]

    expect(sectionsHeadingText(sections)).toBe('Project register')
  })

  it('takes both lines of a two-line heading as one title', () => {
    expect(sectionsHeadingText([
      { componentType: 'hero_showcase', props: { heading: ' Step into ', headingAccent: ' technology ' } },
    ])).toBe('Step into technology')
    expect(sectionsHeadingText([{ componentType: 'hero_showcase', props: { headingAccent: 'technology' } }])).toBe('technology')
    expect(sectionsHeadingText([{ componentType: 'hero_showcase', props: { heading: 'Step in' } }])).toBe('Step in')
    expect(sectionsHeadingText([{ componentType: 'hero_showcase', props: { heading: ' ', headingAccent: '' } }])).toBeUndefined()
  })

  it('falls through when the heading section carries no heading', () => {
    // The caller's fallback is the page's own SEO title or the store's; an
    // empty string must not win over it.
    expect(sectionsHeadingText([{ componentType: 'hero_banner', props: {} }]))
      .toBeUndefined()
    expect(sectionsHeadingText([
      { componentType: 'hero_banner', props: { heading: '   ' } },
    ])).toBeUndefined()
    expect(sectionsHeadingText([
      { componentType: 'hero_banner', props: { heading: 42 } },
    ])).toBeUndefined()
    expect(sectionsHeadingText([{ componentType: 'rich_text', props: { heading: 'x' } }]))
      .toBeUndefined()
    expect(sectionsHeadingText(undefined)).toBeUndefined()
  })
})

describe('sectionRuns', () => {
  const at = (componentType: string, props?: unknown) => ({ componentType, props })

  it('cuts a list into runs of bands and of framed sections, in order', () => {
    const runs = sectionRuns([at('hero_carousel'), at('hero_showcase'), at('store_assurances'), at('products_grid'), at('recently_viewed'), at('newsletter_signup')])

    expect(runs.map(run => [run.bands, run.sections.map(section => section.componentType)])).toEqual([
      [false, ['hero_carousel']],
      [true, ['hero_showcase', 'store_assurances', 'products_grid']],
      [false, ['recently_viewed']],
      [true, ['newsletter_signup']],
    ])
  })

  it('counts the blog categories as a band in their tiles only', () => {
    expect(sectionRuns([at('blog_categories', { layout: 'tiles' })])[0]!.bands).toBe(true)
    expect(sectionRuns([at('blog_categories', { layout: 'slider' })])[0]!.bands).toBe(false)
    expect(sectionRuns([at('blog_categories')])[0]!.bands).toBe(false)
  })

  it('has no run for no section', () => {
    expect(sectionRuns([])).toEqual([])
  })
})
