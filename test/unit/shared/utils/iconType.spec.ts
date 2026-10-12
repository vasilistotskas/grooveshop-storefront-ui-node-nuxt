import { describe, expect, it } from 'vitest'
import { iconMimeType } from '~~/shared/utils/iconType'

describe('iconMimeType', () => {
  it.each([
    ['https://demo.test/img/tenants/demo/favicon-512x512.png', 'image/png'],
    ['https://fyteia.test/favicon.svg', 'image/svg+xml'],
    ['/platform-favicon/favicon.ico', 'image/x-icon'],
    ['https://cdn.test/ICON.PNG', 'image/png'],
    ['https://cdn.test/icon.webp?v=3#top', 'image/webp'],
  ])('declares the type of %s from its extension', (url, type) => {
    expect(iconMimeType(url)).toBe(type)
  })

  it.each([
    ['an unknown extension', 'https://cdn.test/icon.bmp'],
    ['no extension', 'https://cdn.test/icon'],
    ['a dot only in the query', 'https://cdn.test/icon?file=a.png'],
    ['a dot only in the host', 'https://cdn.png/icon'],
  ])('declares none for %s, so the browser sniffs the file', (_case, url) => {
    expect(iconMimeType(url)).toBeUndefined()
  })
})
