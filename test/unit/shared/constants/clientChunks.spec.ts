import { describe, expect, it } from 'vitest'
import {
  CLIENT_CHUNK_BUDGET_BYTES,
  ROUTE_BOOT_CHUNK_NAME,
  SHARED_CHUNK_NAME,
  isRouteBootModule,
  isStyleModuleId,
} from '../../../../shared/constants/clientChunks'

// The same source file under a Windows checkout, a Linux CI checkout and the
// Docker build, whose WORKDIR is `/app`.
const ROOTS = ['C:/Dev/storefront', 'C:\\Dev\\storefront', '/home/runner/work/storefront', '/app']

describe('isRouteBootModule', () => {
  describe.each(ROOTS)('under %s', (root) => {
    const sep = root.includes('\\') ? '\\' : '/'
    const at = (...parts: string[]) => [root, ...parts].join(sep)

    it.each([
      ['a route shell', at('app', 'pages', 'index.vue')],
      ['a nested route shell', at('app', 'pages', 'products', '[id]', '[slug].vue')],
      ['a route shell\'s compiled script', `${at('app', 'pages', 'cart', 'index.vue')}?vue&type=script&setup=true&lang.ts`],
      ['a named middleware', at('app', 'middleware', 'catalogue-enabled.ts')],
      ['the default layout', at('app', 'layouts', 'default.vue')],
      ['the checkout layout', at('app', 'layouts', 'checkout.vue')],
      ['the i18n config', at('i18n', 'i18n.config.mts')],
    ])('takes %s', (_name, id) => {
      expect(isRouteBootModule(id)).toBe(true)
    })

    it.each([
      ['the page editor', at('app', 'pages', '_builder.vue')],
      ['the share preview', at('app', 'pages', '_builder-preview', '[token].vue')],
      ['the page editor\'s compiled script', `${at('app', 'pages', '_builder.vue')}?vue&type=script&setup=true&lang.ts`],
      ['a layout that reaches heavy UI', at('app', 'layouts', 'auth-split.vue')],
      ['a page body', at('app', 'components', 'Storefront', 'ProductDetail.vue')],
      ['a route shell\'s style', `${at('app', 'pages', 'index.vue')}?vue&type=style&index=0&lang.css`],
      ['Nuxt\'s own middleware', at('node_modules', '.pnpm', 'nuxt@4', 'node_modules', 'nuxt', 'dist', 'app', 'middleware', 'route-rules.js')],
      ['a dependency that ships an app/pages folder', at('node_modules', 'some-lib', 'app', 'pages', 'index.vue')],
    ])('leaves out %s', (_name, id) => {
      expect(isRouteBootModule(id)).toBe(false)
    })
  })
})

describe('isStyleModuleId', () => {
  it.each([
    '/app/app/assets/css/main.css',
    '/app/node_modules/maplibre-gl/dist/maplibre-gl.css',
    '/app/app/assets/theme.scss',
    '/app/app/components/Foo.vue?vue&type=style&index=0&scoped=abc&lang.css',
    '/app/app/assets/main.css?inline',
  ])('recognises %s', (id) => {
    expect(isStyleModuleId(id)).toBe(true)
  })

  it.each([
    '/app/app/components/Foo.vue',
    '/app/app/components/Foo.vue?vue&type=script&setup=true&lang.ts',
    '/app/app/utils/cssVariables.ts',
  ])('leaves %s alone', (id) => {
    expect(isStyleModuleId(id)).toBe(false)
  })
})

describe('CLIENT_CHUNK_BUDGET_BYTES', () => {
  it('budgets both chunks every visitor downloads', () => {
    expect(Object.keys(CLIENT_CHUNK_BUDGET_BYTES).sort()).toEqual([SHARED_CHUNK_NAME, ROUTE_BOOT_CHUNK_NAME].sort())
  })
})
