import { describe, expect, it } from 'vitest'
import { DATA_SOURCES } from '~~/shared/constants/builder'
import { DATA_DESCRIPTORS } from '~~/shared/builder/dataSources'
import { BUILDER_QUERY_MODES, builderQueryDefault, builderQueryIds, builderQueryPatch } from '~/utils/builderQuery'

describe('builderQueryDefault', () => {
  it.each(DATA_SOURCES)('starts a %s list in every mode it has as a descriptor the vocabulary does not refuse, but for what only a record can fill', (source) => {
    const modes: Array<string | undefined> = BUILDER_QUERY_MODES[source].length > 0 ? [...BUILDER_QUERY_MODES[source]] : [undefined]
    for (const mode of modes) {
      const started = builderQueryDefault(source, mode, 12)
      const parsed = DATA_DESCRIPTORS[source](12).safeParse(started)
      // A hand-picked list has no record yet and the children of a category no parent: both show as a problem under their field.
      const incomplete = mode === 'picked' || mode === 'children'
      expect(parsed.success, `${source} ${mode}`).toBe(!incomplete)
    }
  })

  it('lists as many as the setting allows, up to the default', () => {
    expect(builderQueryDefault('product', 'filter', 24)).toEqual({ mode: 'filter', ordering: 'newest', limit: 8 })
    expect(builderQueryDefault('product', 'filter', 3)).toEqual({ mode: 'filter', ordering: 'newest', limit: 3 })
  })

  it('starts in the first mode a source has when none is named, and a source without modes is just a limit', () => {
    expect(builderQueryDefault('blogPost', undefined, 24)).toMatchObject({ mode: 'filter' })
    expect(builderQueryDefault('promotion', undefined, 3)).toEqual({ limit: 3 })
  })

  it('starts a hand-picked list empty', () => {
    expect(builderQueryDefault('product', 'picked', 24)).toEqual({ mode: 'picked', ids: [] })
  })
})

describe('builderQueryPatch', () => {
  it('changes a key and keeps the rest', () => {
    expect(builderQueryPatch({ mode: 'filter', ordering: 'newest', limit: 8 }, { limit: 4 })).toEqual({ mode: 'filter', ordering: 'newest', limit: 4 })
  })

  it('takes a key out when the patch sets it to undefined, since a descriptor is closed', () => {
    const patched = builderQueryPatch({ mode: 'filter', categories: [1], ordering: 'newest', limit: 8 }, { categories: undefined })

    expect(patched).toEqual({ mode: 'filter', ordering: 'newest', limit: 8 })
    expect('categories' in patched).toBe(false)
  })

  it('writes the first keys of a descriptor that does not exist yet', () => {
    expect(builderQueryPatch(undefined, { limit: 3 })).toEqual({ limit: 3 })
  })
})

describe('builderQueryIds', () => {
  it('reads the ids of a key, and none from anything else', () => {
    expect(builderQueryIds({ ids: [3, 1] }, 'ids')).toEqual([3, 1])
    expect(builderQueryIds({ ids: 'x' }, 'ids')).toEqual([])
    expect(builderQueryIds({ ids: [1, 'x', 2] }, 'ids')).toEqual([1, 2])
    expect(builderQueryIds(undefined, 'ids')).toEqual([])
  })
})
