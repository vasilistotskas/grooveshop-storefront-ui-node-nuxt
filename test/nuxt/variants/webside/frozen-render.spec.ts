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
import { mockNuxtImport, mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { h } from 'vue'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'

import PageHeader from '~/components/Page/Header.vue'
import PageNavbar from '~/components/Page/Navbar.vue'
import FooterDesktop from '~/components/Footer/Desktop.vue'
import FooterMobile from '~/components/Footer/Mobile.vue'
import MobileBottomNav from '~/components/MobileBottomNav.vue'
import CartButton from '~/components/Cart/CartButton.vue'
import PageTitle from '~/components/Page/Title.vue'
import PageBreadcrumb from '~/components/Page/Breadcrumb.vue'
import EmptyState from '~/components/Empty/State.vue'
import Rating from '~/components/Rating.vue'
import PaginationPageNumber from '~/components/Pagination/PageNumber.vue'
import ProductCard from '~/components/Product/Card.vue'
import ProductCardSkeleton from '~/components/Product/CardSkeleton.vue'
import BlogPostCardDesktop from '~/components/Blog/Post/Card/Desktop.vue'
import BlogPostCardMobile from '~/components/Blog/Post/Card/Mobile.vue'
import ErrorScreen from '~/components/ErrorScreen.vue'
import AccountLoginForm from '~/components/Account/Login/Form.vue'
import AccountSignupForm from '~/components/Account/Signup/Form.vue'
import HeroCarousel from '~/components/PageSection/HeroCarousel.vue'
import BlogCategories from '~/components/PageSection/BlogCategories.vue'
import BlogPostsList from '~/components/PageSection/BlogPostsList.vue'
import RecentlyViewed from '~/components/PageSection/RecentlyViewed.vue'
import DefaultLayout from '~/layouts/default.vue'

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(() => Promise.resolve({})),
}))
mockNuxtImport('$fetch', () => mockFetch)

registerEndpoint('/api/page-config/navigation', () => ({}))
registerEndpoint('/api/settings/public', () => ({
  settings: { RECENTLY_VIEWED_ENABLED: 'true', MOBILE_BOTTOM_NAV_ENABLED: 'true', CART_ENABLED: 'true' },
}))
registerEndpoint('/api/content-pages', () => ({
  links: { next: null, previous: null }, count: 0, totalPages: 1, pageSize: 100, pageTotalResults: 0, page: 1, results: [],
}))
registerEndpoint('/api/blog/categories', () => ({
  links: { next: null, previous: null }, count: 1, totalPages: 1, pageSize: 100, pageTotalResults: 1, page: 1,
  results: [{
    id: 1, uuid: 'c0000000-0000-4000-8000-000000000001', slug: 'asfaleia', active: true, parent: null, level: 0,
    treeId: 1, mainImagePath: '', translations: { el: { name: 'Ασφάλεια', description: '' } },
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', sortOrder: 0, recursivePostCount: 3,
  }],
}))
registerEndpoint('/api/blog/posts', () => ({
  links: { next: null, previous: null }, count: 1, totalPages: 1, pageSize: 9, pageTotalResults: 1, page: 1,
  results: [POST],
}))

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
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
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
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
} as unknown as BlogPost

/** Strip what differs between two identical renders or two file paths. */
function normalise(html: string) {
  return html
    .replace(/\b(id|for|aria-controls|aria-labelledby|aria-describedby|aria-owns)="((?:v-|reka-)[^"]*)"/g, '$1="ID"')
    .replace(/data-v-[0-9a-f]{6,10}/g, 'data-v-X')
    .replace(/\r\n/g, '\n')
}

async function snapshot(component: unknown, options: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(component as never, options as never)
  expect(normalise(wrapper.html())).toMatchSnapshot()
  wrapper.unmount()
}

describe('webside frozen render', () => {
  beforeEach(() => {
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
    await snapshot(MobileBottomNav)
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
    await snapshot(BlogCategories)
  })

  it('section blog_posts_list', async () => {
    await snapshot(BlogPostsList)
  })

  it('section recently_viewed', async () => {
    await snapshot(RecentlyViewed)
  })

  it('default layout with the webside schema', async () => {
    await snapshot(DefaultLayout, { slots: { default: () => h('p', 'page') } })
  })
})
