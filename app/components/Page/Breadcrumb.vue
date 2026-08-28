<script lang="ts" setup>
/**
 * The page breadcrumb: Home → current page.
 *
 * Every page used to hand-roll this same two-item array (and the four
 * webside section variants each carried their own copy INSIDE the
 * section, which is why a tenant rendering generic sections on the
 * same route — /about — got no breadcrumb at all). Labels come from
 * the shared `i18n/locales/breadcrumb` catalogue, keyed by route base
 * name, so a page only has to say `<PageBreadcrumb />`.
 *
 * Renders nothing when the route has no catalogue entry: a missing key
 * must not paint a raw `breadcrumb.items.foo.label` string on the page.
 * Padding is deliberately absent — the page frame (`PageWrapper`) owns
 * the gutters, and adding them here again double-indented the crumb.
 */
const props = defineProps<{
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

const name = computed(() => props.routeName ?? $routeBaseName(route) ?? '')
const hasEntry = computed(
  () => !!name.value && te(`breadcrumb.items.${name.value}.label`),
)

const items = computed(() => {
  if (!hasEntry.value) return []
  const key = `breadcrumb.items.${name.value}`
  return [
    {
      to: localePath('index'),
      label: t('breadcrumb.items.index.label'),
      icon: t('breadcrumb.items.index.icon'),
    },
    {
      to: route.path,
      label: t(`${key}.label`, { storeName: storeName.value }),
      icon: te(`${key}.icon`) ? t(`${key}.icon`) : undefined,
      current: true,
    },
  ]
})
</script>

<template>
  <UBreadcrumb
    v-if="items.length"
    :items="items"
    :ui="{
      item: `
        text-primary-950
        dark:text-primary-50
      `,
      root: `
        text-xs
        md:text-base
      `,
    }"
    class="relative mb-5 min-w-0"
  />
</template>
