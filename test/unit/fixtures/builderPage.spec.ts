import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { makeBuilderPage, makeBuilderSection } from '~~/test/fixtures/builderPage'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * The shape the page route answers, as a schema, so a fixture that drifts
 * from `BuilderPage` fails here and names the key.
 */
const zBuilderSection = z.object({
  id: z.string(),
  componentType: z.string(),
  props: z.record(z.string(), z.unknown()),
})
const zBuilderPage = z.object({
  settings: z.record(z.string(), z.unknown()).optional(),
  sections: z.array(zBuilderSection),
})

describe('makeBuilderSection', () => {
  it('builds a default section that parses', () => {
    expect(problems(zBuilderSection, makeBuilderSection())).toEqual([])
  })

  it('keeps a second section valid and distinct from the first', () => {
    const second = makeBuilderSection({ componentType: 'hero_carousel' })

    expect(problems(zBuilderSection, second)).toEqual([])
    expect(second.id).not.toBe(makeBuilderSection().id)
  })
})

describe('makeBuilderPage', () => {
  it('builds a default page that parses', () => {
    expect(problems(zBuilderPage, makeBuilderPage())).toEqual([])
  })

  it('carries settings and sections and stays valid', () => {
    const page = makeBuilderPage({
      settings: { seoTitle: 'Page title', seoDescription: 'Page description' },
      sections: [makeBuilderSection()],
    })

    expect(problems(zBuilderPage, page)).toEqual([])
  })
})
