<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  productId: {
    type: String,
    required: true,
  },
  reviewsAverage: {
    type: Number,
    required: false,
    default: 0,
  },
  reviewsCount: {
    type: Number,
    required: false,
    default: 0,
  },
  displayImageOf: {
    type: String as PropType<'user' | 'product'>,
    required: true,
    validator: (value: string) => ['user', 'product'].includes(value),
  },
})

const { productId, reviewsAverage, reviewsCount, displayImageOf }
  = toRefs(props)

const { t, locale } = useI18n()
const route = useRoute()
const { $i18n } = useNuxtApp()

const ordering = computed(() => route.query.ordering || '-createdAt')

const {
  data: productReviews,
  status,
  refresh,
} = await useLazyFetch(`/api/products/${productId.value}/reviews`, {
  key: `productReviews${productId.value}`,
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    ordering: ordering,
    languageCode: locale,
  },
})

const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'createdAt',
    label: $i18n.t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const orderingOptions = computed(() => {
  return useOrdering<any>(entityOrdering.value)
})

watch(
  () => route.query,
  async () => {
    await refresh()
  },
)
</script>

<template>
  <div
    class="
      container mx-auto grid gap-2 text-primary-950
      dark:text-primary-50
    "
  >
    <div class="grid gap-4">
      <h2 class="text-2xl font-semibold">
        {{ t('title') }}
      </h2>
      <div
        class="
          grid justify-start gap-4
          md:flex md:items-center
        "
      >
        <div class="grid">
          <Ordering
            :ordering="String(ordering)"
            :ordering-options="orderingOptions.orderingOptionsArray.value"
          />
        </div>
      </div>
    </div>
    <div class="grid">
      <LazyProductReviewsList
        v-if="status !== 'pending' && productReviews?.results?.length"
        class="grid gap-4"
        :display-image-of="displayImageOf"
        :reviews="productReviews.results"
        :reviews-average="reviewsAverage"
        :reviews-count="reviewsCount"
      />
      <div
        v-if="status === 'pending'"
        class="grid gap-4"
      >
        <USkeleton
          v-for="i in (productReviews?.results?.length || 4)"
          :key="i"
          class="h-[92px] w-full"
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Κριτικές
</i18n>
