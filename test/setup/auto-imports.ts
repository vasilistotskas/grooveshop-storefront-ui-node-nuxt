import { vi } from 'vitest'
import { ref, computed } from 'vue'

// Type guards from shared/types/search
globalThis.isProductResult = (result: any) => result.contentType === 'product'
globalThis.isBlogPostResult = (result: any) => result.contentType === 'blog_post'

// Enums from shared/types/enum
globalThis.PaginationCursorStateEnum = {
  BLOG_POSTS: 'blogPostsCursor',
  BLOG_POST_COMMENTS: 'blogPostCommentsCursor',
}

// Nitro/Server functions
globalThis.defineCachedFunction = (fn: Function, options: any) => {
  // Simple mock that just calls the function without caching
  return fn
}

globalThis.$fetch = vi.fn()

// Add stripHtml to global scope if needed by other tests
globalThis.stripHtml = (html: string) => html.replace(/<\/?[^>]+(>|$)/g, '')

globalThis.useI18n = () => ({
  t: (key: string, params?: any) => {
    // Simple translation mock that returns the key
    if (params) {
      return `${key}:${JSON.stringify(params)}`
    }
    return key
  },
  locale: ref('el'),
  locales: ref([
    { code: 'el', name: 'Ελληνικά' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ]),
  setLocale: vi.fn(),
  setLocaleCookie: vi.fn(),
  getLocaleCookie: vi.fn(() => 'el'),
  mergeLocaleMessage: vi.fn(),
})

globalThis.useNuxtApp = () => ({
  $i18n: {
    locale: ref('el'),
    locales: ref([
      { code: 'el', name: 'Ελληνικά' },
      { code: 'en', name: 'English' },
      { code: 'de', name: 'Deutsch' },
    ]),
    t: (key: string) => key,
    setLocale: vi.fn(),
  },
  provide: vi.fn(),
  hook: vi.fn(),
  callHook: vi.fn(),
})

globalThis.useRuntimeConfig = () => ({
  public: {
    apiBaseUrl: 'http://localhost:8000',
    siteUrl: 'http://localhost:3000',
    siteName: 'GrooveShop',
  },
  app: {
    baseURL: '/',
  },
})

globalThis.useRoute = () => ({
  path: '/',
  fullPath: '/',
  params: {},
  query: {},
  hash: '',
  name: 'index',
  meta: {},
  matched: [],
  redirectedFrom: undefined,
})

globalThis.useRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
  currentRoute: ref({
    path: '/',
    fullPath: '/',
    params: {},
    query: {},
    hash: '',
    name: 'index',
    meta: {},
    matched: [],
    redirectedFrom: undefined,
  }),
  options: {
    history: {},
    routes: [],
  },
})

globalThis.navigateTo = vi.fn()

globalThis.useUrls = () => ({
  productUrl: (product: any) => `/products/${product.slug}`,
  categoryUrl: (category: any) => `/categories/${category.slug}`,
  blogPostUrl: (post: any) => `/blog/${post.slug}`,
})
