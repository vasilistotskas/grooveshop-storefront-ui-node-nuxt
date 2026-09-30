/**
 * Render snapshots of everything webside.gr renders TODAY.
 *
 * The platform-default storefront is being rewritten while webside must
 * keep rendering byte-for-byte what it renders now. The mechanism is to
 * freeze the current components as the `@webside` variant and move them
 * into `app/components/variants/webside/`. This spec pins the markup
 * BEFORE that move: every component webside's chrome and pages are made
 * of is mounted with fixed fixtures and its HTML snapshotted. After the
 * move only the import paths in this file change — the snapshot files
 * must pass untouched, otherwise the freeze changed what a visitor sees.
 *
 * Generated ids (`v-…`, `reka-…`) and scoped-style hashes (`data-v-…`)
 * are normalised: the former change with mount order, the latter with
 * the component's FILE PATH, and neither changes what is painted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { h } from 'vue'
import type { Window as HappyDOMWindow } from 'happy-dom'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

import PageHeader from '~/components/variants/webside/Page/Header.vue'
import PageNavbar from '~/components/variants/webside/Page/Navbar.vue'
import FooterDesktop from '~/components/variants/webside/Footer/Desktop.vue'
import FooterMobile from '~/components/variants/webside/Footer/Mobile.vue'
import MobileBottomNav from '~/components/variants/webside/MobileBottomNav.vue'
import CartButton from '~/components/variants/webside/Cart/CartButton.vue'
import PageTitle from '~/components/variants/webside/Page/Title.vue'
import PageBreadcrumb from '~/components/variants/webside/Page/Breadcrumb.vue'
import EmptyState from '~/components/variants/webside/Empty/State.vue'
import Rating from '~/components/variants/webside/Rating.vue'
import PaginationPageNumber from '~/components/variants/webside/Pagination/PageNumber.vue'
import ProductCard from '~/components/variants/webside/Product/Card.vue'
import ProductCardSkeleton from '~/components/variants/webside/Product/CardSkeleton.vue'
import BlogPostCardDesktop from '~/components/variants/webside/Blog/Post/Card/Desktop.vue'
import BlogPostCardMobile from '~/components/variants/webside/Blog/Post/Card/Mobile.vue'
import ErrorScreen from '~/components/variants/webside/ErrorScreen.vue'
import AccountLoginForm from '~/components/variants/webside/Account/Login/Form.vue'
import AccountSignupForm from '~/components/variants/webside/Account/Signup/Form.vue'
import HeroCarousel from '~/components/variants/webside/PageSection/HeroCarousel.vue'
import BlogCategories from '~/components/variants/webside/PageSection/BlogCategories.vue'
import BlogPostsList from '~/components/variants/webside/PageSection/BlogPostsList.vue'
import RecentlyViewed from '~/components/variants/webside/PageSection/RecentlyViewed.vue'
import DefaultLayout from '~/layouts/default.vue'

/**
 * Every request — `$api`, and the `$fetch` that `useApi` / `useLazyApi`
 * transport through — lands on one mock that answers `{}`: the chrome
 * snapshots were captured against empty data, and they must stay that
 * way. (A `registerEndpoint` would be dead here: mocking `$fetch`
 * shadows it.) The sections that exist to show data are served theirs
 * through `api.routes` in their own test only, so no other snapshot
 * sees it.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const PRODUCT = {
  id: 2,
  uuid: 'p0000000-0000-4000-8000-000000000002',
  slug: 'mini-power-bank-5000mah',
  translations: { el: { name: 'Mini Power Bank 5000mAh', description: '<p>Μικρό και ελαφρύ.</p>' } },
  category: 2,
  variantGroup: null,
  brand: null,
  brandName: '',
  price: 14.9,
  vat: 1,
  viewCount: 12,
  stock: 25,
  lowStockThreshold: 10,
  active: true,
  weight: { unit: 'g', value: 120 },
  discountPercent: 10,
  discountValue: 1.49,
  priceSavePercent: 10,
  vatPercent: 24,
  vatValue: 3.22,
  finalPrice: 16.63,
  mainImagePath: 'media/webside/uploads/products/mini-power-bank.avif',
  reviewAverage: 8,
  reviewCount: 3,
  likesCount: 4,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  attributes: [],
} as unknown as Product

const POST = {
  id: 82,
  uuid: 'b0000000-0000-4000-8000-000000000082',
  slug: 'ti-einai-ta-mah',
  likes: [],
  translations: { el: { title: 'Τι είναι τα mAh', subtitle: 'Και τι ρόλο παίζουν σε ένα powerbank', body: '<p>Κείμενο.</p>' } },
  author: 4,
  category: 1,
  tags: [],
  featured: false,
  viewCount: 40,
  likesCount: 2,
  commentsCount: 1,
  tagsCount: 0,
  mainImagePath: 'media/webside/uploads/blog/mah.avif',
  isPublished: true,
  publishedAt: '2026-09-01T09:00:00Z',
  createdAt: '2026-09-01T09:00:00Z',
  updatedAt: '2026-09-01T09:00:00Z',
} as unknown as BlogPost

/**
 * Strip what differs between two identical renders, two file paths, or
 * two releases — generated ids, the scoped-style hash (derived from the
 * component's path) and the app version the footer prints, which
 * semantic-release bumps on every merge.
 */
function normalise(html: string) {
  return html
    .replace(/\b(id|for|aria-controls|aria-labelledby|aria-describedby|aria-owns)="((?:v-|reka-)[^"]*)"/g, '$1="ID"')
    .replace(/data-v-[0-9a-f]{6,10}/g, 'data-v-X')
    .replace(/\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?/g, 'VERSION')
    .replace(/\r\n/g, '\n')
}

/** A one-page list payload, as Django paginates it. */
function page<T>(results: T[], pageSize: number) {
  return {
    links: { next: null, previous: null },
    count: results.length,
    totalPages: 1,
    pageSize,
    pageTotalResults: results.length,
    page: 1,
    results,
  }
}

const BLOG_CATEGORY = {
  id: 1,
  uuid: 'c0000000-0000-4000-8000-000000000001',
  slug: 'asfaleia',
  active: true,
  parent: null,
  level: 0,
  treeId: 1,
  mainImagePath: '',
  translations: { el: { name: 'Ασφάλεια', description: '' } },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  sortOrder: 0,
  recursivePostCount: 3,
}

/** What `useRecentlyViewed` reads from localStorage on the client. */
const RECENTLY_VIEWED_KEY = 'grooveshop:recently-viewed'
const RECENTLY_VIEWED = [{
  id: PRODUCT.id,
  slug: PRODUCT.slug,
  name: 'Mini Power Bank 5000mAh',
  mainImagePath: PRODUCT.mainImagePath,
  finalPrice: PRODUCT.finalPrice,
  addedAt: Date.parse('2026-09-01T09:00:00Z'),
}]

/**
 * Mount, wait until `ready` holds for sections whose content arrives
 * after the mount (a `useLazyApi` fetch, a `<ClientOnly>` swap, a lazy
 * chunk), and snapshot. A section that never gets there fails here
 * instead of pinning its empty state.
 */
async function snapshot(
  component: unknown,
  options: Record<string, unknown> = {},
  ready?: (html: string) => void,
) {
  const wrapper = await mountSuspended(component as never, options as never)
  // The bound, not a delay: `waitFor` returns as soon as `ready` holds.
  // The first `LazyUCarousel` in a file is a cold Vite transform, which
  // took over the 1s default under a loaded parallel run.
  if (ready) await vi.waitFor(() => ready(wrapper.html()), { timeout: 4000 })
  expect(normalise(wrapper.html())).toMatchSnapshot()
  wrapper.unmount()
}

/**
 * Render at a phone's width. `useDevice` is `useMediaQuery`, which reads
 * happy-dom's `matchMedia`, and that follows the window's viewport.
 */
async function atViewportWidth(width: number, run: () => Promise<void>) {
  // The nuxt environment's `window` IS a happy-dom Window (@nuxt/test-utils
  // builds it with `domEnvironment: 'happy-dom'`); lib.dom's `Window`
  // does not declare happy-dom's control API, hence the re-typing.
  const { happyDOM } = window as unknown as HappyDOMWindow
  const before = window.innerWidth
  const height = window.innerHeight
  happyDOM.setViewport({ width, height })
  try {
    await run()
  }
  finally {
    happyDOM.setViewport({ width: before, height })
  }
}

describe('webside frozen render', () => {
  beforeEach(() => {
    // `useApi` caches by key on the shared app: without this a section
    // would render whatever an earlier test's mount left behind.
    clearNuxtData()
    clearNuxtState('recently-viewed:items')
    localStorage.removeItem(RECENTLY_VIEWED_KEY)
    // `app.vue` seeds this on every real render; the harness mounts a
    // component without it, and the blog list reads it in setup.
    useState<CursorState>('cursor-state').value = generateInitialCursorState()
    useTenantStore().setConfig(validTenantConfig('webside.gr', {
      schemaName: 'webside',
      name: 'Webside',
      storeName: 'Webside',
      isPlatformStorefront: true,
      primaryColor: 'neutral',
      neutralColor: 'zinc',
      blogEnabled: true,
      loyaltyEnabled: true,
      recommendationsEnabled: true,
      agentCommerceEnabled: true,
    }) as TenantConfig)
  })

  it('header shell', async () => {
    await snapshot(PageHeader, { slots: { default: () => h('nav', 'nav') } })
  })

  it('navbar', async () => {
    await snapshot(PageNavbar)
  })

  it('footer desktop', async () => {
    await snapshot(FooterDesktop)
  })

  it('footer mobile', async () => {
    await snapshot(FooterMobile)
  })

  it('mobile bottom nav', async () => {
    // It only exists below the `lg` breakpoint (`MobileOrTabletOnly`).
    await atViewportWidth(375, () => snapshot(MobileBottomNav, {}, (html) => {
      expect(html).toContain('aria-label="Mobile navigation"')
    }))
  })

  it('cart button', async () => {
    await snapshot(CartButton)
  })

  it('page title', async () => {
    await snapshot(PageTitle, { props: { text: 'Προϊόντα' } })
  })

  it('page breadcrumb', async () => {
    await snapshot(PageBreadcrumb, { props: { routeName: 'products' } })
  })

  it('empty state', async () => {
    await snapshot(EmptyState, { props: { title: 'Δεν υπάρχουν προϊόντα', description: 'Δοκίμασε άλλα φίλτρα.' } })
  })

  it('rating', async () => {
    await snapshot(Rating, { props: { rate: 7 } })
  })

  it('pagination page number', async () => {
    await snapshot(PaginationPageNumber, { props: { count: 50, pageSize: 10, page: 2 } })
  })

  it('product card', async () => {
    await snapshot(ProductCard, { props: { product: PRODUCT, showVat: true } })
  })

  it('product card skeleton', async () => {
    await snapshot(ProductCardSkeleton)
  })

  it('blog post card desktop', async () => {
    await snapshot(BlogPostCardDesktop, { props: { post: POST } })
  })

  it('blog post card mobile', async () => {
    await snapshot(BlogPostCardMobile, { props: { post: POST } })
  })

  it('error screen 404', async () => {
    await snapshot(ErrorScreen, { props: { error: { statusCode: 404, statusMessage: 'Not Found', message: 'Not Found' } } })
  })

  it('error screen 500', async () => {
    await snapshot(ErrorScreen, { props: { error: { statusCode: 500, statusMessage: 'Server Error', message: 'Server Error' } } })
  })

  it('login form', async () => {
    await snapshot(AccountLoginForm)
  })

  it('signup form', async () => {
    await snapshot(AccountSignupForm)
  })

  it('section hero_carousel', async () => {
    await snapshot(HeroCarousel, {
      props: { images: ['/img/main-banner.png'], mobileImages: ['/img/main-banner-mobile.png'], link: '/products/2/mini-power-bank-5000mah' },
    })
  })

  it('section blog_categories', async () => {
    api.routes({ '/api/blog/categories': page([BLOG_CATEGORY], 100) })

    await snapshot(BlogCategories, {}, (html) => {
      expect(html).toContain('Ασφάλεια')
    })
  })

  it('section blog_posts_list', async () => {
    api.routes({ '/api/blog/posts': page([POST], 9) })

    await snapshot(BlogPostsList, {}, (html) => {
      expect(html).toContain('Τι είναι τα mAh')
    })
  })

  it('section recently_viewed', async () => {
    api.routes({ '/api/settings/public': { settings: { RECENTLY_VIEWED_ENABLED: 'true' } } })
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(RECENTLY_VIEWED))

    await snapshot(RecentlyViewed, {}, (html) => {
      expect(html).toContain('Mini Power Bank 5000mAh')
    })
  })

  it('default layout with the webside schema', async () => {
    await snapshot(DefaultLayout, { slots: { default: () => h('p', 'page') } })
  })
})
