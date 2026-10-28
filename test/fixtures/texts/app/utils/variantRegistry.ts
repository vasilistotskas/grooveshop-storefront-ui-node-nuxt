// The shape of app/utils/variantRegistry.ts, over the fixture tree: the
// reachability walk reads this file as source and never runs it (the
// constants are exported only so the linter sees them used).
const lazy = (loader: () => Promise<unknown>) => loader

export const chromeDefaults = {
  footer: lazy(() => import('~/components/Chrome/Footer.vue')),
}

export const pageDefaults = {
  home: lazy(() => import('~/components/Storefront/Home.vue')),
}

export const variants = {
  'chrome:footer@webside': lazy(() => import('~/components/variants/webside/Chrome/Footer.vue')),
  'page:home@webside': lazy(() => import('~/components/variants/webside/Storefront/Home.vue')),
}

export const designLayouts = {
  auth: 'auth-split',
} as const

export const REDESIGN_ONLY_PAGES = new Set<string>([])
