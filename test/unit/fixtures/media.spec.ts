import { describe, expect, it } from 'vitest'

import { zAsset, zResolvedAsset } from '~~/shared/openapi/zod.gen'
import { makeAsset, makeResolvedAsset } from '~~/test/fixtures/media'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/** Parsed strictly, so a renamed field fails here rather than in a spec passing against a payload Django cannot send. */
describe('media fixtures', () => {
  it('makeResolvedAsset parses strictly', () => {
    expect(problems(zResolvedAsset, makeResolvedAsset())).toEqual([])
  })

  it('makeAsset parses strictly, with its uploader and its pages', () => {
    const asset = makeAsset({ uploadedBy: { id: 7, name: 'Maria Papadopoulou' }, usedBy: ['page:home'] })

    expect(problems(zAsset, asset)).toEqual([])
  })
})
