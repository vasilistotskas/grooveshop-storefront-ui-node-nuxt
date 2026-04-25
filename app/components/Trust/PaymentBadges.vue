<script lang="ts" setup>
/**
 * Payment-method trust row.
 *
 * Fetches the active PayWay records from the Django backend
 * (`/api/pay-way`, Nitro-cached 1h with 24h SWR) and renders each one
 * as a small badge using the PayWay's own uploaded icon (via
 * `mainImagePath`) and its translated display name. Falls back to the
 * translated enum label when an icon file isn't configured.
 *
 * The shared `key: 'pay-way-badges'` dedupes the request across every
 * mount point (Footer/Desktop, Footer/Mobile, Checkout/Sidebar), so the
 * whole trust row is a single network trip per page.
 *
 * Renders nothing if the fetch fails or no active pay-ways exist —
 * empty trust rows are worse than none.
 */

const { t, locale } = useI18n()
const { getPaymentMethodName } = usePaymentMethod()

const { data } = await useFetch('/api/pay-way', {
  key: 'pay-way-badges',
  query: { active: true },
  server: true,
  lazy: true,
  // PayWay rows change rarely; let the Nitro-level cache do the
  // heavy lifting and keep the client watcher idle.
  deep: false,
})

const items = computed(() => {
  const results = data.value?.results ?? []
  return results
    .filter(p => p?.active)
    .map((p) => {
      const enumName = extractTranslated(p, 'name', locale.value) as string | undefined
      const displayName = enumName ? getPaymentMethodName(enumName) : null
      return {
        id: p.id,
        providerCode: p.providerCode ?? '',
        name: displayName || enumName || '',
        image: p.mainImagePath || null,
      }
    })
    .filter(item => !!item.name)
})
</script>

<template>
  <div
    v-if="items.length > 0"
    :aria-label="t('payment_methods')"
    class="flex flex-wrap items-center gap-2"
  >
    <UIcon
      name="i-mdi-credit-card-outline"
      class="h-5 w-5 text-neutral-500 dark:text-neutral-300"
      aria-hidden="true"
    />
    <span
      v-for="item in items"
      :key="item.id"
      :title="item.name"
      class="
        inline-flex h-7 items-center gap-1.5 rounded border
        border-neutral-200 bg-white px-2 shadow-sm
        dark:border-neutral-700 dark:bg-neutral-100
      "
    >
      <ImgWithFallback
        v-if="item.image"
        :src="item.image"
        :alt="item.name"
        class="h-4 w-auto object-contain"
        :width="24"
        :height="16"
        loading="lazy"
      />
      <span
        v-else
        class="text-[11px] font-semibold tracking-wide text-neutral-700"
      >
        {{ item.name }}
      </span>
    </span>
  </div>
</template>

<i18n lang="yaml">
el:
  payment_methods: Τρόποι πληρωμής
</i18n>
