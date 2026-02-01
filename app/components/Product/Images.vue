<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  product: {
    type: Object as PropType<Product>,
    required: true,
  },
})

const { product } = toRefs(props)
const { t, locale } = useI18n()

const { data: images } = await useFetch(
  `/api/products/${product.value.id}/images`,
  {
    key: `productImages${product.value.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

const selectedImage = ref(images.value?.find(image => image.isMain || image.id === images.value?.[0]?.id))
const selectedImageId = ref(selectedImage.value?.id)
const isModalOpen = ref(false)
const modalInitialIndex = ref(0)

watch(
  () => selectedImageId.value,
  (value) => {
    const image = images.value?.find(image => image.id === value)
    if (image) {
      selectedImage.value = image
    }
  },
  { deep: true, immediate: true },
)

function openModal(index?: number) {
  if (images.value && images.value.length > 0) {
    if (index !== undefined) {
      modalInitialIndex.value = index
    }
    else {
      const currentIndex = images.value.findIndex(img => img.id === selectedImageId.value)
      modalInitialIndex.value = currentIndex >= 0 ? currentIndex : 0
    }
    isModalOpen.value = true
  }
}

const hasMultipleImages = computed(() => images.value && images.value.length > 1)
</script>

<template>
  <div
    class="flex flex-col"
    :class="[hasMultipleImages ? `
      gap-3
      sm:gap-4
    ` : '']"
  >
    <UCard
      variant="soft"
      :ui="{
        body: `
          relative p-0
          sm:p-0
        `,
      }"
    >
      <UTooltip :text="t('viewFullscreen')" :delay-duration="500">
        <UButton
          type="button"
          variant="ghost"
          color="neutral"
          :ui="{
            base: `
              group relative flex w-full overflow-hidden rounded-md p-0
              transition-all duration-200
              hover:opacity-95
            `,
          }"
          :aria-label="t('viewFullSizeImage')"
          @click="openModal()"
        >
          <ProductImage
            :image="selectedImage"
            img-loading="eager"
            class="w-full rounded-md transition-transform duration-300"
          />

          <div
            class="
              absolute inset-0 flex items-center justify-center bg-black/0
              opacity-0 transition-all duration-200
              group-hover:bg-black/20 group-hover:opacity-100
            "
          >
            <div
              class="
                flex items-center gap-2 rounded-full bg-white/90 px-3 py-2
                text-sm font-medium text-gray-900 backdrop-blur-sm
              "
            >
              <UIcon name="i-heroicons-magnifying-glass-plus" class="h-5 w-5" />
              <span
                class="
                  hidden
                  sm:inline
                "
              >{{ t('viewFullscreen') }}</span>
            </div>
          </div>

          <UBadge
            v-if="hasMultipleImages"
            :label="t('photosCount', { count: images?.length })"
            color="neutral"
            variant="solid"
            size="md"
            icon="i-heroicons-photo"
            class="
              absolute top-2 right-2 backdrop-blur-sm
              sm:top-3 sm:right-3
            "
          />
        </UButton>
      </UTooltip>
    </UCard>

    <LazyUCarousel
      v-if="hasMultipleImages"
      v-slot="{ item, index }"
      :items="images"
      :ui="{
        item: `
          basis-1/3
          sm:basis-1/4
          lg:basis-1/5
        `,
      }"
      class="overflow-hidden rounded-lg"
      arrows
      :prev="{ size: 'sm', square: true, color: 'neutral' }"
      :next="{ size: 'sm', square: true, color: 'neutral' }"
    >
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        :ui="{
          base: `
            relative rounded-none p-1 ring-0
            hover:bg-transparent
          `,
        }"
        :aria-label="t('selectImage', { number: index + 1 })"
        :aria-pressed="selectedImageId === item.id"
        @click="selectedImageId = item.id"
        @dblclick="openModal(index)"
      >
        <ProductImage
          :key="item.id"
          :image="item"
          :width="90"
          :height="60"
          img-loading="lazy"
          :class="`
            relative w-full rounded-md
            ${selectedImageId === item.id ? `
              ring-1 ring-neutral-500 ring-offset-1
              dark:ring-neutral-100
            ` : ''}
          `"
        />
      </UButton>
    </LazyUCarousel>

    <div
      v-if="hasMultipleImages"
      class="
        flex items-center justify-center gap-2 text-xs text-gray-500
        sm:hidden
        dark:text-gray-400
      "
    >
      <UIcon name="i-heroicons-information-circle" class="h-4 w-4" />
      <span>{{ t('doubleTapHint') }}</span>
    </div>

    <LazyProductImageModal
      v-if="images && isModalOpen"
      :key="`modal-${modalInitialIndex}`"
      v-model="isModalOpen"
      :images="images"
      :initial-index="modalInitialIndex"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  viewFullscreen: Προβολή σε πλήρη οθόνη
  viewFullSizeImage: Προβολή εικόνας σε πλήρες μέγεθος
  photosCount: '{count} εικόνες'
  imageNumber: Εικόνα {number}
  selectImage: Επιλογή εικόνας {number}
  doubleTapHint: Διπλό πάτημα στη μικρογραφία για πλήρη οθόνη
</i18n>

<style scoped>
/**
 * Reduced motion support for Product Images
 * Disables animations and transitions for users who prefer reduced motion
 */
@media (prefers-reduced-motion: reduce) {
  :deep(.transition-all),
  :deep(.transition-transform),
  :deep(.transition-colors),
  :deep(.transition-opacity) {
    transition: none;
  }

  /* Disable hover effects */
  :deep(.group:hover) {
    transform: none;
  }
}
</style>
