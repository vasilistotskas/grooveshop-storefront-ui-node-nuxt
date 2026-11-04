import { describe, expect, it } from 'vitest'
import * as z from 'zod'
import { dataPointers } from '~~/shared/builder/dataPointers'
import { builderField } from '~~/shared/builder/fields'
import type { DataDeclaration } from '~~/shared/types/builder'
import cases from '~~/test/fixtures/builder/data-cases.json'

/**
 * The shared vectors of the data settings: `test/fixtures/builder/data-cases.json`
 * is vendored by Django (`builder/tests`) like `placement-cases.json`, so both
 * repositories hold the same cases. This side proves what only the storefront
 * can: the declaration is what `builderField` emits, and the value is
 * accepted or refused as the case says. Django's side checks the issue codes,
 * the references and the dependency rows (`refs`, `deps`), which the
 * catalogue's JSON Schema cannot state.
 */
interface DataCase {
  name: string
  declaration: DataDeclaration
  value: unknown
  valid: boolean
  issues: Array<{ path: string, code: string }>
  refs: Array<[string, string]>
  deps: Array<[string, string]>
}

const fieldOf = (declaration: DataDeclaration) => declaration.field === 'ref'
  ? builderField.ref(declaration.kind, { onMissing: declaration.onMissing })
  : builderField.query(declaration.source, { onEmpty: declaration.onEmpty, maxLimit: declaration.maxLimit })

describe('data-cases.json', () => {
  it('holds enough cases to mean something', () => {
    expect(cases.length).toBeGreaterThanOrEqual(25)
    expect(new Set(cases.map(({ name }) => name)).size).toBe(cases.length)
  })

  describe.each(cases as DataCase[])('$name', (testCase) => {
    it('declares what builderField declares', () => {
      const pointers = dataPointers(z.object({ setting: fieldOf(testCase.declaration) }))

      expect(pointers).toEqual({ '/setting': testCase.declaration })
    })

    it('is accepted or refused as the case says', () => {
      expect(fieldOf(testCase.declaration).safeParse(testCase.value).success).toBe(testCase.valid)
    })

    it.runIf(testCase.valid)('names no issue', () => {
      expect(testCase.issues).toEqual([])
    })

    it.runIf(!testCase.valid)('names its issues, and no reference or dependency', () => {
      expect(testCase.issues.length).toBeGreaterThan(0)
      expect(testCase.refs).toEqual([])
      expect(testCase.deps).toEqual([])
    })
  })
})
