import { describe, expect, it } from 'vitest'

import { zDocumentList } from '~~/shared/openapi/zod.gen'
import { makeBuilderDocumentRow } from '~~/test/fixtures/builderDocument'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/** Parsed strictly, so a renamed field fails here rather than in a spec passing against a payload Django cannot send. */
describe('builder document fixtures', () => {
  it('makeBuilderDocumentRow parses strictly', () => {
    expect(problems(zDocumentList, makeBuilderDocumentRow())).toEqual([])
  })

  it('makeBuilderDocumentRow gives each kind of key its kind, and a saver', () => {
    for (const key of ['theme', 'group:footer', 'template:home', 'page:summer-sale']) {
      const row = makeBuilderDocumentRow({ key, updatedBy: { id: 9, name: 'Nikos' } })

      expect(problems(zDocumentList, row)).toEqual([])
      expect(row.kind).toBe(key.split(':')[0])
    }
  })
})
