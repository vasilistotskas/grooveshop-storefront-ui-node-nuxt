<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  review: {
    type: Object as PropType<ProductReview>,
    required: true,
  },
  displayImageOf: {
    type: String as PropType<'user' | 'product'>,
    required: true,
    validator: (value: string) => ['user', 'product'].includes(value),
  },
})

const { review, displayImageOf } = toRefs(props)

const product = computed(() => review?.value?.product)
const userAccount = computed(() => review?.value?.user)

const { locale } = useI18n()
const { contentShorten } = useText()

const src = computed(() => {
  return displayImageOf.value === 'user'
    ? userAccount.value?.mainImagePath
    : product.value?.mainImagePath
})

const alt = computed(() => {
  return displayImageOf.value === 'user'
    ? (userAccount.value?.fullName || 'Anonymous')
    : extractTranslated(product?.value, 'name', locale.value)
})

const productName = computed(() =>
  extractTranslated(product?.value, 'name', locale.value),
)

const reviewComment = computed(() => {
  return contentShorten(
    extractTranslated(review?.value, 'comment', locale.value),
    0,
    110,
  )
})
</script>

<template>
  <div
    class="
      flex flex-col gap-2

      md:items-center
    "
  >
    <div
      class="
        flex items-center gap-2

        md:w-full md:gap-6
      "
    >
      <div class="size-auto">
        <LazyUserAvatar
          v-if="userAccount && displayImageOf === 'user'"
          :user-account="userAccount"
        />
        <div
          v-if="displayImageOf === 'product' && product"
          class="grid gap-2"
        >
          <Anchor
            :to="{ path: product.absoluteUrl }"
            :text="productName"
          >
            <ImgWithFallback
              loading="lazy"
              class="product-img w-30 bg-primary-100 h-20 object-cover"
              :src="src"
              :alt="alt"
              densities="x1"
            />
          </Anchor>
        </div>
      </div>
      <div
        class="
          grid gap-2 text-2xl

          md:gap-4
        "
      >
        <LazyAnchor
          v-if="displayImageOf === 'product' && product"
          :to="{ path: product.absoluteUrl }"
          :text="productName"
        >
          <span class="text-lg font-medium">{{ productName }}</span>
        </LazyAnchor>
        <Rating :rate="review.rate" />
      </div>
    </div>
    <div
      class="
        grid gap-2

        md:flex md:w-full md:justify-between
      "
    >
      <span
        class="
          text-ellipsis break-all

          md:w-full
        "
      >
        {{ reviewComment }}
      </span>
      <div
        class="
          flex items-center

          md:justify-end
        "
      >
        <div class="text-xs">
          <NuxtTime :datetime="review.createdAt" :locale="locale" />
        </div>
      </div>
    </div>
  </div>
</template>
