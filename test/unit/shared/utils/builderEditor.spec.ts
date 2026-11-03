import { describe, expect, it } from 'vitest'
import {
  builderDocumentAt,
  builderDocumentKey,
  builderDocumentPath,
  builderSharePath,
  builderSurfaceOf,
  hasBuilderCanvasMarker,
  isBuilderEditorPath,
  isBuilderSharePath,
  parseBuilderDocumentKey,
} from '~~/shared/utils/builderEditor'

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

describe('builderSurfaceOf', () => {
  it.each([
    ['/_builder', 'editor'],
    ['/en/_builder?doc=template:home', 'editor'],
    ['/_builder/preview/abc_def-ghi?page=home', 'share'],
    ['/en/_builder/preview/abc_def-ghi', 'share'],
    ['/?builder-canvas', 'canvas'],
    ['/en/products?builder-canvas', 'canvas'],
    ['/products', null],
    ['/', null],
  ])('reads %j as %j', (path, surface) => {
    expect(builderSurfaceOf(path)).toBe(surface)
  })
})

describe('isBuilderSharePath', () => {
  it.each(['/_builder/preview/abc', '/en/_builder/preview/abc?page=about'])('is true for the share link at %j', (path) => {
    expect(isBuilderSharePath(path)).toBe(true)
  })

  it.each(['/_builder', '/_builder/preview', '/_builder/preview/', '/preview/abc', '/en/blog'])('is false for %j', (path) => {
    expect(isBuilderSharePath(path)).toBe(false)
  })

  it('is the address builderSharePath writes, which names the page of the link', () => {
    const path = builderSharePath('tok-en_1', 'summer-sale')

    expect(path).toBe('/_builder/preview/tok-en_1?page=summer-sale')
    expect(isBuilderSharePath(path)).toBe(true)
  })
})

describe('document keys', () => {
  it.each([
    ['group:header', { kind: 'group', name: 'header' }],
    ['template:blog-post', { kind: 'template', name: 'blog-post' }],
    ['page:summer-sale', { kind: 'page', name: 'summer-sale' }],
    ['theme', { kind: 'theme' }],
  ])('reads %j', (key, parsed) => {
    expect(parseBuilderDocumentKey(key)).toEqual(parsed)
  })

  it('writes the key it reads', () => {
    expect(builderDocumentKey('group', 'footer')).toBe('group:footer')
    expect(parseBuilderDocumentKey(builderDocumentKey('page', 'a'))).toEqual({ kind: 'page', name: 'a' })
  })
})

describe('builderDocumentPath', () => {
  it.each([
    ['template:home', '/'],
    ['template:products', '/products'],
    ['template:about', '/about'],
    ['page:summer-sale', '/summer-sale'],
    ['template:unknown-type', undefined],
    ['group:header', undefined],
    ['theme', undefined],
  ])('draws %j at %j', (key, path) => {
    expect(builderDocumentPath(key)).toBe(path)
  })
})

describe('builderDocumentAt', () => {
  const keys = ['group:header', 'template:home', 'template:blog', 'template:blog-post', 'template:about', 'page:summer-sale', 'page:about']

  it.each([
    ['/', 'template:home'],
    ['/en', 'template:home'],
    ['/en/', 'template:home'],
    ['/blog', 'template:blog'],
    ['/about', 'template:about'],
    ['/summer-sale', 'page:summer-sale'],
    ['/en/summer-sale/?utm_source=x#top', 'page:summer-sale'],
    ['/products', undefined],
    ['/products/12/phone', undefined],
    ['/cart', undefined],
  ])('opens %j as %j', (path, key) => {
    expect(builderDocumentAt(path, keys)).toBe(key)
  })
})
