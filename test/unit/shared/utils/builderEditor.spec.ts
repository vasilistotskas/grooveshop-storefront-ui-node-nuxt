import { describe, expect, it } from 'vitest'
import { isBuilderEditorPath } from '~~/shared/utils/builderEditor'

describe('isBuilderEditorPath', () => {
  it.each(['/_builder', '/_builder/', '/en/_builder', '/el/_builder?ticket=abc'])('is true for the editor at %j', (path) => {
    expect(isBuilderEditorPath(path)).toBe(true)
  })

  it.each(['/', '/en', '/_builder-tips', '/blog/_builder', '/fr/_builder', '/_builder/preview'])('is false for %j', (path) => {
    expect(isBuilderEditorPath(path)).toBe(false)
  })
})
