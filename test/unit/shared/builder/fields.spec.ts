import { describe, expect, it } from 'vitest'
import { builderField } from '~~/shared/builder/fields'

describe('builderField.link', () => {
  const link = builderField.link()

  it.each([
    { href: 'https://example.com/a?b=1' },
    { route: '/offers' },
    { route: '/account/signup' },
    { ref: { kind: 'product', id: 2 } },
    { ref: { kind: 'category', id: 3 } },
    { ref: { kind: 'blogCategory', id: 5 } },
    { ref: { kind: 'blogPost', id: 4 } },
    { ref: { kind: 'page', id: 'about' } },
    { ref: { kind: 'contentPage', id: 'privacy' } },
  ])('accepts %j', (value) => {
    expect(link.safeParse(value).success).toBe(true)
  })

  it.each([
    ['a typed internal path', '/products/2/x'],
    ['a bare string', 'https://example.com'],
    ['an empty object', {}],
    ['null', null],
    ['an http URL', { href: 'http://example.com' }],
    ['an internal path as href', { href: '/offers' }],
    ['a route that is not fixed', { route: '/products/2/x' }],
    ['two targets', { href: 'https://example.com', route: '/offers' }],
    ['an unknown key', { route: '/offers', target: '_blank' }],
    ['a menu ref', { ref: { kind: 'menu', id: 'header_menu' } }],
    ['a media ref', { ref: { kind: 'media', id: 1 } }],
    ['an unknown kind', { ref: { kind: 'order', id: 1 } }],
    ['a string-encoded id', { ref: { kind: 'product', id: '2' } }],
    ['a zero id', { ref: { kind: 'product', id: 0 } }],
    ['an id beyond a 32-bit key', { ref: { kind: 'product', id: 2_147_483_648 } }],
    ['a numeric page key', { ref: { kind: 'page', id: 3 } }],
    ['a slug with a slash', { ref: { kind: 'contentPage', id: 'a/b' } }],
    ['an empty slug', { ref: { kind: 'contentPage', id: '' } }],
    ['a ref with an unknown key', { ref: { kind: 'product', id: 2, slug: 'x' } }],
  ])('refuses %s', (_, value) => {
    expect(link.safeParse(value).success).toBe(false)
  })
})
