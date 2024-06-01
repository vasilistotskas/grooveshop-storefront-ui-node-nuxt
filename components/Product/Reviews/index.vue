<script lang="ts" setup>
import type { PropType } from 'vue'

import type { EntityOrdering } from '~/types/ordering'
import type { ProductReviewOrderingField } from '~/types/product/review'

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

const { t } = useI18n()
const route = useRoute()
const { locale } = useI18n()

const ordering = computed(() => route.query.ordering || '-createdAt')
const expand = computed(() => 'true')

const {
  data: productReviews,
  pending,
  refresh,
} = await useFetch(`/api/products/${productId.value}/reviews`, {
  key: `productReviews${productId.value}`,
  method: 'GET',
  query: {
    ordering: ordering.value,
    expand: expand.value,
    language: locale.value,
  },
})

const entityOrdering = ref<EntityOrdering<ProductReviewOrderingField>>([
  {
    value: 'id',
    label: t('components.product.reviews.ordering.id'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'createdAt',
    label: t('components.product.reviews.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const orderingOptions = computed(() => {
  return useOrdering<ProductReviewOrderingField>(entityOrdering.value)
})

watch(
  () => route.query,
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      await refresh()
    }
  },
)
</script>

<template>
  <div
    v-if="!pending && productReviews && productReviews?.length > 0"
    class="
      container-md text-primary-950 grid gap-2 border-t border-primary-500 !px-0
      !py-6

      dark:text-primary-50 dark:border-primary-500

      md:!p-6
    "
  >
    <div class="grid gap-4">
      <h2 class="text-2xl font-semibold">
        {{ $t('components.product.reviews.title') }}
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
      <div class="grid gap-4">
        <ProductReviewsList
          :display-image-of="displayImageOf"
          :reviews="productReviews"
          :reviews-average="reviewsAverage"
          :reviews-count="reviewsCount"
        />
      </div>
    </div>
  </div>
</template>
