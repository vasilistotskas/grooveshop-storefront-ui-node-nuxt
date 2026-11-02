import { describe, expect, it } from 'vitest'
import { hasBuilderCanvasMarker, isBuilderEditorPath } from '~~/shared/utils/builderEditor'

describe('isBuilderEditorPath', () => {
  it.each(['/_builder', '/_builder/', '/en/_builder', '/el/_builder?ticket=abc'])('is true for the editor at %j', (path) => {
    expect(isBuilderEditorPath(path)).toBe(true)
  })

  it.each(['/', '/en', '/_builder-tips', '/blog/_builder', '/fr/_builder', '/_builder/preview'])('is false for %j', (path) => {
    expect(isBuilderEditorPath(path)).toBe(false)
  })
})

describe('hasBuilderCanvasMarker', () => {
  it.each(['/?builder-canvas', '/products?builder-canvas=1', '/en/blog?page=2&builder-canvas', '/contact?builder-canvas#form'])('is true for the preview at %j', (path) => {
    expect(hasBuilderCanvasMarker(path)).toBe(true)
  })

  it.each(['/', '/products?builder-canvas-x', '/builder-canvas', '/?q=builder-canvas', '/#builder-canvas'])('is false for %j', (path) => {
    expect(hasBuilderCanvasMarker(path)).toBe(false)
  })
})
