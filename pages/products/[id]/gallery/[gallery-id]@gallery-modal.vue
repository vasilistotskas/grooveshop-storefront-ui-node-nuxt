<script setup lang="ts">
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
    imageId.value = mainSliderItems.value[currentIndex - 1].id
  }
}

const goNext = () => {
  const currentIndex = mainSliderItems.value.findIndex(image => image.id === imageId.value)
  if (currentIndex >= 0 && currentIndex < mainSliderItems.value.length - 1) {
    imageId.value = mainSliderItems.value[currentIndex + 1].id
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
    v-model="isOpen" :ui="{
      width: 'w-full sm:max-w-3xl',
    }"
  >
    <div
      class="flex h-full items-center justify-center"
    >
      <UCarousel
        :items="mainSliderItems"
        :prev-button="{
          icon: 'i-heroicons-arrow-left-20-solid',
          onClick: () => goPrevious(),
        }"
        :next-button="{
          icon: 'i-heroicons-arrow-right-20-solid',
          onClick: () => goNext(),
        }"
        class="overflow-hidden rounded-lg"
        :ui="{
          item: 'basis-full',
          indicators: {
            inactive: 'mix-blend-difference',
          },
        }"
        arrows
        indicators
      >
        <template #default="{ item }">
          <ImgWithFallback
            :id="item.id"
            provider="mediaStream"
            class="h-full w-full bg-white"
            :style="{ objectFit: 'contain' }"
            :src="resolveImageSrc(
              item?.src,
              `media/uploads/products/${item?.src}`,
            )"
            :width="768"
            :height="512"
            :fit="'contain'"
            :position="'entropy'"
            :background="'transparent'"
            :trim-threshold="5"
            :format="'webp'"
            :alt="'Main Banner'"
            densities="x1"
            :loading="item.loading"
          />
        </template>
        <template #indicator="{ onClick, page: pageNumber, active }">
          <UButton
            :label="String(pageNumber)"
            :variant="active ? 'solid' : 'outline'"
            size="2xs"
            class="min-w-6 justify-center rounded-full"
            @click="() => {
              onIndicatorClick(pageNumber)
              onClick(pageNumber)
            }"
          />
        </template>
      </UCarousel>
      <UButton
        class="absolute right-4 top-4 p-0"
        size="xl"
        type="button"
        color="red"
        variant="ghost"
        icon="i-heroicons-x-mark-20-solid"
        :aria-label="$t('common.close')"
        @click="() => {
          isOpen = false
          modalRouter.close()
        }"
      />
    </div>
  </UModal>
</template>
