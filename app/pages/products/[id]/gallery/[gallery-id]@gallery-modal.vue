<script lang="ts" setup>
type MainSliderItem = {
  id: number
  src: string | null | undefined
  loading: string
}

const router = useRouter()
const modalRouter = useModalRouter()
const { resolveImageSrc } = useImageResolver()
const { locale } = useI18n()

const productId = computed(() => router.currentRoute.value.params.id as string)
const galleryId = computed(() => router.currentRoute.value.params.galleryid as string)

const isOpen = ref(true)
const mainSliderItems = ref<MainSliderItem[]>([])
const imageId = ref(Number.parseInt(router.currentRoute.value.params.galleryid as string) || 1)

const { data: images } = await useLazyFetch(
  `/api/products/${productId.value}/images`,
  {
    key: `productImages${productId.value}`,
    method: 'GET',
    query: {
      language: locale.value,
    },
  },
)

const goPrevious = () => {
  const currentIndex = mainSliderItems.value.findIndex(image => image.id === imageId.value)
  if (currentIndex > 0) {
    const previousItem = mainSliderItems.value[currentIndex - 1]
    if (previousItem) {
      imageId.value = previousItem.id
    }
  }
}

const goNext = () => {
  const currentIndex = mainSliderItems.value.findIndex(image => image.id === imageId.value)
  if (currentIndex >= 0 && currentIndex < mainSliderItems.value.length - 1) {
    const nextItem = mainSliderItems.value[currentIndex + 1]
    if (nextItem) {
      imageId.value = nextItem.id
    }
  }
}

const onIndicatorClick = (pageNumber: number) => {
  const sliderItem = mainSliderItems.value[pageNumber - 1]
  if (sliderItem) {
    imageId.value = sliderItem.id
  }
}

watch(
  () => isOpen.value,
  (value) => {
    if (!value) {
      useModalRouter().close()
    }
  },
)

watch(
  () => galleryId.value,
  (newVal, _oldVal) => {
    imageId.value = Number.parseInt(newVal)
  },
)

watch(
  () => imageId.value,
  (newVal, _oldVal) => {
    useModalRouter().push(`/products/${productId.value}/gallery/${newVal}`)
  },
)

watch(
  () => imageId.value,
  (newVal, _oldVal) => {
    mainSliderItems.value = images.value?.map(image => ({
      id: image.id,
      src: image.mainImageFilename,
      loading: 'lazy',
    })).sort((a, b) => {
      if (Number(newVal) === a.id) {
        return -1
      }
      if (Number(newVal) === b.id) {
        return 1
      }
      return 0
    }) || []
  },
  { once: true },
)
</script>

<template>
  <UModal
    v-model="isOpen"
    :ui="{
      width: 'w-full sm:max-w-3xl',
    }"
  >
    <div
      class="flex h-full items-center justify-center"
    >
      <UCarousel
        :items="mainSliderItems"
        :ui="{
          item: 'basis-full',
          indicators: {
            inactive: 'mix-blend-difference',
          },
        }"
        arrows
        class="overflow-hidden rounded-lg"
        indicators
      >
        <template #prev="{ onClick, disabled }">
          <UButton
            :aria-label="$t('common.prev')"
            :disabled="disabled"
            icon="i-heroicons-arrow-left-20-solid"
            @click="() => {
              onClick()
              goPrevious()
            }"
          />
        </template>

        <template #next="{ onClick, disabled }">
          <UButton
            :aria-label="$t('common.next')"
            :disabled="disabled"
            icon="i-heroicons-arrow-right-20-solid"
            @click="() => {
              onClick()
              goNext()
            }"
          />
        </template>
        <template #default="{ item }">
          <ImgWithFallback
            :id="item.id"
            :alt="'Main Banner'"
            :background="'transparent'"
            :fit="'contain'"
            :format="'webp'"
            :height="512"
            :loading="item.loading"
            :position="'entropy'"
            :src="resolveImageSrc(
              item?.src,
              `media/uploads/products/${item?.src}`,
            )"
            :style="{ objectFit: 'contain' }"
            :trim-threshold="5"
            :width="768"
            class="h-full w-full bg-white"
            densities="x1"
            provider="mediaStream"
          />
        </template>
        <template #indicator="{ onClick, page: pageNumber, active }">
          <UButton
            :label="String(pageNumber)"
            :variant="active ? 'solid' : 'outline'"
            class="min-w-6 justify-center rounded-full"
            size="2xs"
            @click="() => {
              onIndicatorClick(pageNumber)
              onClick(pageNumber)
            }"
          />
        </template>
      </UCarousel>
      <UButton
        :aria-label="$t('common.close')"
        class="absolute right-4 top-4 p-0"
        color="red"
        icon="i-heroicons-x-mark-20-solid"
        size="xl"
        type="button"
        variant="ghost"
        @click="() => {
          isOpen = false
          modalRouter.close()
        }"
      />
    </div>
  </UModal>
</template>
