<script lang="ts" setup>
import type { PropType, Ref } from 'vue'

import type { EntityOrdering, OrderingOption } from '~/types/ordering'
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

const { productId, reviewsAverage, reviewsCount, displayImageOf } =
  toRefs(props)

const { t } = useI18n()
const route = useRoute()

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
    expand,
  },
})

const entityOrdering: Ref<EntityOrdering<ProductReviewOrderingField>> = ref([
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

const orderingFields: Partial<
  Record<ProductReviewOrderingField, OrderingOption[]>
> = reactive({
  id: [],
  userId: [],
  productId: [],
  createdAt: [],
})

const orderingOptions = computed(() => {
  return useOrdering<ProductReviewOrderingField>(
    entityOrdering.value,
    orderingFields,
  )
})

watch(
  () => route.query,
  () => refresh(),
  { deep: true },
)
</script>

<template>
  <div
    v-if="!pending && productReviews && productReviews?.length > 0"
    class="container-sm text-primary-800 dark:text-primary-100 grid gap-2 border-t border-gray-900/10 !px-0 !py-6 dark:border-gray-50/20 md:!p-6"
  >
    <div class="grid gap-4">
      <h2 class="text-2xl font-semibold">
        {{ $t('components.product.reviews.title') }}
      </h2>
      <div class="grid justify-start gap-4 md:flex md:items-center">
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
          :reviews-average="reviewsAverage"
          :reviews-count="reviewsCount"
          :reviews="productReviews"
          :display-image-of="displayImageOf"
        />
      </div>
    </div>
  </div>
</template>
