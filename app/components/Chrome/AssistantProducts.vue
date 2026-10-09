<script lang="ts" setup>
/**
 * The product list one `products` event stands for. The event carries ids
 * only; each product is loaded here through the storefront's own product
 * API, all in parallel, so the cards show current data at this shopper's
 * price. A product that cannot be loaded (gone, or inactive) is dropped
 * silently — the assistant's text still stands.
 */
const props = defineProps<{ event: ShopChatProducts }>()

const emit = defineEmits<{ navigate: [] }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()

const products = ref<ProductRetrieve[]>([])
const loading = ref(true)

// A search that matched more than it listed still says how many it found.
const isSearch = computed(() => props.event.tool === 'search_products')
const total = computed(() => props.event.total ?? props.event.ids.length)
const showSummary = computed(() => isSearch.value && props.event.total !== undefined)
const searchLocation = computed(() =>
  props.event.query && total.value > 0
    ? localePath({ name: 'search', query: { query: props.event.query } })
    : undefined,
)

async function load() {
  const results = await Promise.allSettled(
    props.event.ids.map(id =>
      $api<ProductRetrieve>(`/api/products/${id}`, {
        query: { languageCode: locale.value },
      }),
    ),
  )
  products.value = results.flatMap((result) => {
    if (result.status === 'rejected') {
      const statusCode = (result.reason as { statusCode?: number })?.statusCode
      if (statusCode !== 404) {
        log.warn({ tag: 'shop-chat', message: 'product card failed to load' })
      }
      return []
    }
    return result.value.active === false ? [] : [result.value]
  })
  loading.value = false
}

onMounted(load)
</script>

<template>
  <section
    v-if="showSummary || loading || products.length > 0"
    class="my-2 flex min-w-0 flex-col gap-2"
    :aria-label="t('region')"
  >
    <div
      v-if="showSummary"
      class="flex items-center justify-between gap-2"
    >
      <p class="text-xs font-semibold text-muted">
        {{ t('found', { count: total }, total) }}
      </p>
      <UButton
        v-if="searchLocation"
        :to="searchLocation"
        :label="t('view_all')"
        trailing-icon="i-lucide-arrow-right"
        color="neutral"
        variant="link"
        size="xs"
        @click="emit('navigate')"
      />
    </div>

    <ul
      v-if="loading"
      class="flex gap-2 overflow-hidden"
      :aria-label="t('loading')"
      aria-busy="true"
    >
      <li
        v-for="id in event.ids"
        :key="id"
        class="w-40 shrink-0"
      >
        <USkeleton class="h-56 w-full rounded-xl" />
      </li>
    </ul>
    <ul
      v-else-if="products.length > 0"
      class="
        -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1
        [scrollbar-width:thin]
      "
    >
      <ChromeAssistantProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        @navigate="emit('navigate')"
      />
    </ul>
  </section>
</template>

<i18n lang="yaml">
el:
  region: Προϊόντα που βρήκε ο βοηθός
  loading: Φόρτωση προϊόντων
  found: 'Δεν βρέθηκαν προϊόντα | Βρέθηκε {count} προϊόν | Βρέθηκαν {count} προϊόντα'
  view_all: Δες όλα
en:
  region: Products the assistant found
  loading: Loading products
  found: 'No products found | Found {count} product | Found {count} products'
  view_all: View all
</i18n>
