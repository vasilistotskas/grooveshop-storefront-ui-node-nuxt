import { describe, it, expect } from 'vitest'
import {
  HEADING_SECTION_TYPES,
  sectionsHeadingText,
  sectionsProvideForm,
  sectionsProvideHeading,
} from '../../../shared/pageSections'

/**
 * Which section owns a page's h1, which owns its form, and what the
 * page's `<title>` should say. All three are page-level questions
 * answered from the section list, and getting the first one wrong cost
 * the homepage its h1 and `/contact` a second one.
 */
describe('pageSections', () => {
  it('knows the three section types that own a page heading', () => {
    expect([...HEADING_SECTION_TYPES].sort()).toEqual([
      'contact_panel',
      'hero_banner',
      'page_hero',
    ])
  })

  it('reports a heading only when one of those is present', () => {
    expect(sectionsProvideHeading([{ componentType: 'page_hero' }])).toBe(true)
    expect(sectionsProvideHeading([{ componentType: 'rich_text' }])).toBe(false)
    expect(sectionsProvideHeading(undefined)).toBe(false)
  })

  it('reports a form only for the section that carries one', () => {
    expect(sectionsProvideForm([{ componentType: 'contact_panel' }])).toBe(true)
    expect(sectionsProvideForm([{ componentType: 'page_hero' }])).toBe(false)
  })

  it('takes the page title from the heading section, localised', () => {
    const sections = [
      { componentType: 'partner_strip', props: { heading: 'Not this one' } },
      { componentType: 'page_hero', props: { heading: 'Project register' } },
      { componentType: 'cta_banner', props: { heading: 'Nor this' } },
    ]

    expect(sectionsHeadingText(sections)).toBe('Project register')
  })

  it('falls through when the heading section carries no heading', () => {
    // The caller's fallback is `PageLayout.title`; an empty string
    // must not win over it.
    expect(sectionsHeadingText([{ componentType: 'page_hero', props: {} }]))
      .toBeUndefined()
    expect(sectionsHeadingText([
      { componentType: 'page_hero', props: { heading: '   ' } },
    ])).toBeUndefined()
    expect(sectionsHeadingText([
      { componentType: 'page_hero', props: { heading: 42 } },
    ])).toBeUndefined()
    expect(sectionsHeadingText([{ componentType: 'rich_text', props: { heading: 'x' } }]))
      .toBeUndefined()
    expect(sectionsHeadingText(undefined)).toBeUndefined()
  })
})
