<script lang="ts" setup>
/**
 * The page breadcrumb: Home → … → current page.
 *
 * A page names its own trail with `items` (a category page walks its
 * ancestors). Without it the crumb is Home → this route, labelled from
 * the shared `i18n/locales/breadcrumb` catalogue by route base name, so
 * a page only has to say `<PageBreadcrumb />` — and renders nothing for
 * a route with no catalogue entry: a missing key must not paint a raw
 * `breadcrumb.items.foo.label` string on the page.
 *
 * The look is the theme's (`breadcrumb` in `utils/voltTheme.ts`), and
 * spacing is the page's: the crumb carries no margin of its own.
 */
export interface BreadcrumbTrailItem {
  label: string
  /** Unprefixed path; the last item is the current page and takes none. */
  to?: string
}

const props = defineProps<{
  /** The crumbs after Home, the current page last. */
  items?: BreadcrumbTrailItem[]
  /** Override the route base name used to look the label up. */
  routeName?: string
}>()

const { t, te } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { $routeBaseName } = useNuxtApp()
const tenantStore = useTenantStore()
const config = useRuntimeConfig()

// Some labels interpolate the store name; passing it unconditionally
// is harmless for the ones that don't.
const storeName = computed(
  () => tenantStore.storeName || (config.public.appTitle as string),
)

// `$routeBaseName` is typed as `keyof RouteMapI18n`, and that map only
// narrows to the generated route names when @nuxtjs/i18n's typed-route
// augmentation is in scope; otherwise it falls back to vue-router's
// `RouteMapGeneric`, whose key became `string | symbol` in vue-router
// 5.3. A base name is always a string at runtime, so narrow it here
// rather than let the symbol leak into the message-key interpolation
// below.
const name = computed(
  () => props.routeName ?? ($routeBaseName(route) as string | undefined) ?? '',
)

const trail = computed<BreadcrumbTrailItem[]>(() => {
  if (props.items) return props.items
  const key = `breadcrumb.items.${name.value}.label`
  return name.value && te(key) ? [{ label: t(key, { storeName: storeName.value }) }] : []
})

const crumbs = computed(() => {
  if (!trail.value.length) return []
  const last = trail.value.length - 1
  return [
    { label: t('breadcrumb.items.index.label'), to: localePath('index') },
    ...trail.value.map((item, index) => index === last
      ? { label: item.label, to: route.path, current: true }
      : { label: item.label, to: item.to ? localePath(item.to) : undefined }),
  ]
})
</script>

<template>
  <UBreadcrumb
    v-if="crumbs.length"
    :items="crumbs"
  />
</template>
