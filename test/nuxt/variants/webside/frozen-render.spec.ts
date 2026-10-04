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
import { mockComponent, mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { h, ref } from 'vue'
import type { Ref } from 'vue'
import type { Window as HappyDOMWindow } from 'happy-dom'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { makeUserDetails } from '~~/test/fixtures/user'
import { makeOrderListItem } from '~~/test/fixtures/order'
import { makeProduct } from '~~/test/fixtures/product'
import { makeSummary, makeTier } from '~~/test/fixtures/loyalty'

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
import AccountOverview from '~/components/variants/webside/Storefront/Account/Overview.vue'
import AccountOrders from '~/components/variants/webside/Storefront/Account/Orders.vue'
import AccountFavouriteProducts from '~/components/variants/webside/Storefront/Account/FavouriteProducts.vue'
import AccountAddresses from '~/components/variants/webside/Storefront/Account/Addresses.vue'
import AccountSettings from '~/components/variants/webside/Storefront/Account/Settings.vue'
import AccountReauthenticate from '~/components/variants/webside/Storefront/Auth/Reauthenticate.vue'
import NewsletterConfirm from '~/components/variants/webside/Storefront/NewsletterConfirm.vue'

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
mockNuxtImport('useRequestApi', () => () => api)

/**
 * Signed out for everything captured before the account area was frozen;
 * the account cases sign in. The full surface, because the auth plugin
 * reads it while the app boots.
 */
const session = vi.hoisted(() => ({
  loggedIn: undefined as unknown as Ref<boolean>,
  user: undefined as unknown as Ref<UserDetails | null>,
}))
mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  session.user ??= ref(null)
  return {
    loggedIn: session.loggedIn,
    user: session.user,
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})

/**
 * The default layout renders the shared (not frozen) chat widget as the
 * `assistant` chrome, which webside maps to it. The snapshot pins its
 * not-yet-loaded wrapper (`<!---->`); left real, the widget's chunk —
 * `UDrawer` with it — loaded after the test and failed on a torn-down
 * environment under coverage. The module is mocked to a stub that renders
 * the same `<!---->`; `__esModule` lets the async chrome wrapper unwrap
 * `default` the way it does a real module.
 */
vi.mock('~/components/Chat/Widget.vue', () => ({ __esModule: true, default: { render: () => null } }))

/**
 * `UTooltip` needs `UApp`'s TooltipProvider, which a bare mount does not
 * have. The stub keeps the trigger and the tooltip's text (as `title`),
 * so a changed tooltip still changes the snapshot.
 */
mockComponent('UTooltip', { props: { text: { type: String, default: '' } }, template: '<div :title="text"><slot /></div>' })

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
async function expectSnapshot(
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
    if (session.loggedIn) {
      session.loggedIn.value = false
      session.user.value = null
    }
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
    await expectSnapshot(PageHeader, { slots: { default: () => h('nav', 'nav') } })
  })

  it('navbar', async () => {
    await expectSnapshot(PageNavbar)
  })

  it('footer desktop', async () => {
    await expectSnapshot(FooterDesktop)
  })

  it('footer mobile', async () => {
    await expectSnapshot(FooterMobile)
  })

  it('mobile bottom nav', async () => {
    // It only exists below the `lg` breakpoint (`MobileOrTabletOnly`).
    await atViewportWidth(375, () => expectSnapshot(MobileBottomNav, {}, (html) => {
      expect(html).toContain('aria-label="Mobile navigation"')
    }))
  })

  it('cart button', async () => {
    await expectSnapshot(CartButton)
  })

  it('page title', async () => {
    await expectSnapshot(PageTitle, { props: { text: 'Προϊόντα' } })
  })

  it('page breadcrumb', async () => {
    await expectSnapshot(PageBreadcrumb, { props: { routeName: 'products' } })
  })

  it('empty state', async () => {
    await expectSnapshot(EmptyState, { props: { title: 'Δεν υπάρχουν προϊόντα', description: 'Δοκίμασε άλλα φίλτρα.' } })
  })

  it('rating', async () => {
    await expectSnapshot(Rating, { props: { rate: 7 } })
  })

  it('pagination page number', async () => {
    await expectSnapshot(PaginationPageNumber, { props: { count: 50, pageSize: 10, page: 2 } })
  })

  it('product card', async () => {
    await expectSnapshot(ProductCard, { props: { product: PRODUCT, showVat: true } })
  })

  it('product card skeleton', async () => {
    await expectSnapshot(ProductCardSkeleton)
  })

  it('blog post card desktop', async () => {
    await expectSnapshot(BlogPostCardDesktop, { props: { post: POST } })
  })

  it('blog post card mobile', async () => {
    await expectSnapshot(BlogPostCardMobile, { props: { post: POST } })
  })

  it('error screen 404', async () => {
    await expectSnapshot(ErrorScreen, { props: { error: { statusCode: 404, statusMessage: 'Not Found', message: 'Not Found' } } })
  })

  it('error screen 500', async () => {
    await expectSnapshot(ErrorScreen, { props: { error: { statusCode: 500, statusMessage: 'Server Error', message: 'Server Error' } } })
  })

  it('login form', async () => {
    await expectSnapshot(AccountLoginForm)
  })

  it('signup form', async () => {
    await expectSnapshot(AccountSignupForm)
  })

  it('section hero_carousel', async () => {
    await expectSnapshot(HeroCarousel, {
      props: { images: ['/img/main-banner.png'], mobileImages: ['/img/main-banner-mobile.png'], link: '/products/2/mini-power-bank-5000mah' },
    })
  })

  it('section blog_categories', async () => {
    api.routes({ '/api/blog/categories': page([BLOG_CATEGORY], 100) })

    await expectSnapshot(BlogCategories, {}, (html) => {
      expect(html).toContain('Ασφάλεια')
    })
  })

  it('section blog_posts_list', async () => {
    api.routes({ '/api/blog/posts': page([POST], 9) })

    await expectSnapshot(BlogPostsList, {}, (html) => {
      expect(html).toContain('Τι είναι τα mAh')
    })
  })

  it('section recently_viewed', async () => {
    api.routes({ '/api/settings/public': { settings: { RECENTLY_VIEWED_ENABLED: 'true' } } })
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(RECENTLY_VIEWED))

    await expectSnapshot(RecentlyViewed, {}, (html) => {
      expect(html).toContain('Mini Power Bank 5000mAh')
    })
  })

  it('default layout with the webside schema', async () => {
    await expectSnapshot(DefaultLayout, { slots: { default: () => h('p', 'page') } })
  })

  /**
   * The account area, the re-auth pages and the newsletter confirmation
   * were captured BEFORE they moved behind `@webside` page keys: until
   * then webside rendered the platform defaults there, so these pin what
   * a signed-in webside shopper sees today.
   */
  describe('signed in', () => {
    const USER = makeUserDetails({ id: 1, firstName: 'Μαρία', lastName: 'Παπαδοπούλου', email: 'maria@webside.test' })
    const FAVOURITE: ProductFavourite = {
      id: 1,
      userId: USER.id,
      userUsername: USER.username ?? '',
      product: { ...makeProduct({ id: 2, translations: { el: { name: 'Mini Power Bank 5000mAh' } } }), priceDropAlertsEnabled: false },
      createdAt: '2026-09-01T09:00:00Z',
      uuid: 'f0000000-0000-4000-8000-000000000001',
    }

    beforeEach(() => {
      session.loggedIn.value = true
      session.user.value = USER
    })

    it('account chrome', async () => {
      await expectSnapshot(DefaultLayout, { route: '/account', slots: { default: () => h('p', 'page') } }, (html) => {
        expect(html).toContain('Μαρία')
      })
    })

    it('account overview', async () => {
      api.routes({
        '/api/loyalty/settings': { LOYALTY_ENABLED: 'true' },
        '/api/loyalty/summary': makeSummary(),
        '/api/loyalty/tiers': [makeTier()],
      })

      await expectSnapshot(AccountOverview, { route: '/account' })
    })

    it('account orders', async () => {
      api.routes({ '/api/orders/my-orders': page([makeOrderListItem({ id: 7 })], 10) })

      await expectSnapshot(AccountOrders, { route: '/account/orders' })
    })

    it('account favourite products', async () => {
      api.routes({
        '/api/user/account/1/favourite-products': page([FAVOURITE], 10),
        '/api/products/favourites/favourites-by-products': [],
      })

      await expectSnapshot(AccountFavouriteProducts, { route: '/account/favourites/products' }, (html) => {
        expect(html).toContain('Mini Power Bank 5000mAh')
      })
    })

    it('account addresses', async () => {
      api.routes({ '/api/user/account/1/addresses': page([], 10) })

      await expectSnapshot(AccountAddresses, { route: '/account/addresses' })
    })

    it('account settings', async () => {
      api.routes({ '/api/user/account/1': USER })

      await expectSnapshot(AccountSettings, { route: '/account/settings' })
    })

    it('re-authenticate', async () => {
      await expectSnapshot(AccountReauthenticate, { route: '/account/reauthenticate' })
    })
  })

  it('newsletter confirmation', async () => {
    await expectSnapshot(NewsletterConfirm, { route: '/newsletter/confirm/abc' })
  })
})
