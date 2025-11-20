<script setup lang="ts">
import type { PropType } from 'vue'
import { useMouseInElement, useElementBounding } from '@vueuse/core'

const props = defineProps({
  images: {
    type: Array as PropType<ProductImage[]>,
    required: true,
  },
  initialIndex: {
    type: Number,
    default: 0,
  },
})

const modelValue = defineModel<boolean>({ required: true })

const { t, locale } = useI18n()
const img = useImage()

const activeIndex = ref(props.initialIndex)
const carousel = useTemplateRef('carousel')
const imageContainerRef = ref<HTMLElement | null>(null)

const magnifierSize = 360
const zoomLevel = 2.5
const showMagnifier = ref(false)

const { isMobileOrTablet } = useDevice()

const getImage = (mainImagePath: string) => {
  return img(mainImagePath, {
    width: 1920,
    height: 1920,
    fit: 'cover',
    quality: 100,
    format: 'png',
  }, {
    provider: 'mediaStream',
  })
}

const { elementX, elementY, isOutside } = useMouseInElement(imageContainerRef)
const { width: containerWidth, height: containerHeight } = useElementBounding(imageContainerRef)

const magnifierStyle = computed(() => {
  if (!showMagnifier.value || isOutside.value || isMobileOrTablet) {
    return { display: 'none' }
  }

  const left = elementX.value - magnifierSize / 2
  const top = elementY.value - magnifierSize / 2

  const bgX = (elementX.value / containerWidth.value) * 100
  const bgY = (elementY.value / containerHeight.value) * 100

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${magnifierSize}px`,
    height: `${magnifierSize}px`,
    backgroundPosition: `${bgX}% ${bgY}%`,
    backgroundSize: `${containerWidth.value * zoomLevel}px ${containerHeight.value * zoomLevel}px`,
  }
})

watch(() => props.initialIndex, (newIndex) => {
  activeIndex.value = newIndex
  nextTick(() => {
    carousel.value?.emblaApi?.scrollTo(newIndex)
  })
})

watch(activeIndex, (newIndex) => {
  showMagnifier.value = false
  imageContainerRef.value = null

  nextTick(() => {
    carousel.value?.emblaApi?.scrollTo(newIndex)
  })
})

function onClickPrev() {
  if (activeIndex.value > 0) {
    activeIndex.value--
  }
}

function onClickNext() {
  if (activeIndex.value < props.images.length - 1) {
    activeIndex.value++
  }
}

function onSelect(index: number) {
  activeIndex.value = index
}

function selectImage(index: number) {
  activeIndex.value = index
}

function onImageClick() {
  if (!isMobileOrTablet) {
    showMagnifier.value = !showMagnifier.value
  }
}

function closeModal() {
  modelValue.value = false
}

const hasMultipleImages = computed(() => props.images.length > 1)
const currentImagePosition = computed(() => `${activeIndex.value + 1}/${props.images.length}`)
const currentImage = computed(() => props.images[activeIndex.value])

defineShortcuts({
  arrowleft: {
    usingInput: false,
    handler: () => {
      if (modelValue.value && activeIndex.value > 0) {
        activeIndex.value--
      }
    },
  },
  arrowright: {
    usingInput: false,
    handler: () => {
      if (modelValue.value && activeIndex.value < props.images.length - 1) {
        activeIndex.value++
      }
    },
  },
  home: {
    usingInput: false,
    handler: () => {
      if (modelValue.value) {
        activeIndex.value = 0
      }
    },
  },
  end: {
    usingInput: false,
    handler: () => {
      if (modelValue.value) {
        activeIndex.value = props.images.length - 1
      }
    },
  },
})

watch(modelValue, (isOpen) => {
  if (!isOpen) {
    showMagnifier.value = false
  }
})
</script>

<template>
  <UModal
    v-model:open="modelValue"
    :title="t('productImage', { product: currentImage?.product })"
    :description="currentImagePosition"
    fullscreen
    :ui="{
      content: 'bg-white',
    }"
  >
    <template #content>
      <div
        class="
          flex h-dvh flex-col
          md:h-full
        "
      >
        <div
          class="
            absolute top-2 right-2 z-10 mb-2 flex items-center justify-between
            gap-3
            sm:mb-4
          "
        >
          <UBadge
            v-if="hasMultipleImages"
            :label="currentImagePosition"
            color="neutral"
            variant="soft"
            size="lg"
            class="backdrop-blur-sm"
          />

          <div
            v-if="!isMobileOrTablet && hasMultipleImages"
            class="
              hidden items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs
              text-black backdrop-blur-sm
              md:flex
            "
          >
            <span>{{ t('navigate') }}:</span>
            <div class="flex items-center gap-1">
              <UKbd value="←" size="sm" />
              <UKbd value="→" size="sm" />
            </div>
            <span>|</span>
            <span>{{ t('jump') }}:</span>
            <div class="flex items-center gap-1">
              <UKbd :value="t('first')" size="sm" />
              <UKbd :value="t('last')" size="sm" />
            </div>
          </div>

          <UButton
            :aria-label="t('close')"
            color="error"
            variant="subtle"
            icon="i-heroicons-x-mark"
            size="lg"
            class="rounded-full backdrop-blur-sm"
            @click="closeModal"
          />
        </div>

        <div
          class="
            flex flex-1 flex-col gap-2 overflow-hidden
            sm:gap-4
            md:flex-row
          "
        >
          <div
            class="
              relative order-1 flex flex-1 items-center justify-center
              md:order-2
            "
          >
            <UCarousel
              v-if="hasMultipleImages"
              ref="carousel"
              v-slot="{ item, index }"
              :items="images"
              :start-index="activeIndex"
              arrows
              :prev="{
                color: 'neutral',
                variant: 'subtle',
                size: isMobileOrTablet ? 'md' : 'lg',
                square: true,
                onClick: onClickPrev,
                disabled: activeIndex === 0,
              }"
              :next="{
                color: 'neutral',
                variant: 'subtle',
                size: isMobileOrTablet ? 'md' : 'lg',
                square: true,
                onClick: onClickNext,
                disabled: activeIndex === images.length - 1,
              }"
              :ui="{
                root: 'flex h-full w-full items-center',
                prev: `
                  left-2
                  sm:left-4
                `,
                next: `
                  right-2
                  sm:right-4
                `,
              }"
              class="h-full w-full"
              @select="onSelect"
            >
              <div class="flex h-full max-h-full items-center justify-center">
                <div
                  v-if="index === activeIndex"
                  ref="imageContainerRef"
                  class="relative overflow-hidden"
                  :style="{ cursor: !isMobileOrTablet ? (showMagnifier ? 'zoom-out' : 'zoom-in') : 'default' }"
                  @click="onImageClick"
                >
                  <ImgWithFallback
                    class="
                      max-h-full w-auto touch-pinch-zoom rounded-lg bg-white
                      object-contain select-none
                    "
                    loading="eager"
                    width="1000"
                    height="1000"
                    fit="contain"
                    quality="100"
                    :src="item?.mainImagePath"
                    :alt="extractTranslated(item, 'title', locale)"
                    @dragstart.prevent
                  />

                  <div
                    v-if="!isMobileOrTablet && showMagnifier"
                    id="magnifier"
                    class="
                      pointer-events-none absolute z-50 rounded-full border-4
                      border-white shadow-2xl backdrop-blur-none
                    "
                    :style="{
                      ...magnifierStyle,
                      backgroundImage: `url(${getImage(item?.mainImagePath)})`,
                      backgroundRepeat: 'no-repeat',
                    }"
                  />
                </div>
                <div
                  v-else
                  class="relative overflow-hidden"
                >
                  <ImgWithFallback
                    class="
                      max-h-full w-auto touch-pinch-zoom rounded-lg bg-white
                      object-contain select-none
                    "
                    loading="eager"
                    width="1000"
                    height="1000"
                    fit="contain"
                    quality="100"
                    :src="item?.mainImagePath"
                    :alt="extractTranslated(item, 'title', locale)"
                    @dragstart.prevent
                  />
                </div>
              </div>
            </UCarousel>

            <div
              v-else
              class="flex h-full max-h-full items-center justify-center"
            >
              <div
                ref="imageContainerRef"
                class="relative overflow-hidden"
                :style="{ cursor: !isMobileOrTablet ? (showMagnifier ? 'zoom-out' : 'zoom-in') : 'default' }"
                @click="onImageClick"
              >
                <ImgWithFallback
                  class="
                    max-h-[90vh] w-auto touch-pinch-zoom rounded-lg bg-white
                    object-contain select-none
                  "
                  loading="eager"
                  width="1000"
                  height="1000"
                  fit="contain"
                  quality="100"
                  :src="images[0]?.mainImagePath"
                  :alt="extractTranslated(images[0], 'title', locale)"
                  @dragstart.prevent
                />

                <div
                  v-if="!isMobileOrTablet && showMagnifier && images[0]?.mainImagePath"
                  id="magnifier"
                  class="
                    pointer-events-none absolute z-50 rounded-full border-4
                    border-white shadow-2xl backdrop-blur-none
                  "
                  :style="{
                    ...magnifierStyle,
                    backgroundImage: `url(${getImage(images[0].mainImagePath)})`,
                    backgroundRepeat: 'no-repeat',
                  }"
                />
              </div>
            </div>

            <template v-if="!isMobileOrTablet && hasMultipleImages">
              <UTooltip
                v-if="activeIndex > 0"
                :text="t('previous')"
                :kbds="['←']"
                class="
                  absolute left-2
                  sm:left-4
                "
              >
                <div
                  class="
                    pointer-events-none h-10 w-10
                    sm:h-12 sm:w-12
                  "
                />
              </UTooltip>

              <UTooltip
                v-if="activeIndex < images.length - 1"
                :text="t('next')"
                :kbds="['→']"
                class="
                  absolute right-2
                  sm:right-4
                "
              >
                <div
                  class="
                    pointer-events-none h-10 w-10
                    sm:h-12 sm:w-12
                  "
                />
              </UTooltip>
            </template>
          </div>

          <div
            v-if="hasMultipleImages"
            class="
              order-2 flex flex-row gap-4 overflow-x-auto px-4 py-2 pb-2
              sm:gap-3 sm:px-6
              md:order-1 md:my-4 md:w-20 md:flex-col md:gap-4
              md:overflow-x-visible md:overflow-y-auto md:px-6 md:py-2
              lg:w-32
            "
          >
            <UButton
              v-for="(image, index) in images"
              :key="image.id"
              :aria-label="t('viewImage', { number: index + 1 })"
              variant="ghost"
              color="neutral"
              :ui="{
                base: `
                  relative flex-shrink-0 bg-transparent p-0
                  hover:bg-transparent
                `,
              }"
              @click="selectImage(index)"
            >
              <ProductImage
                :image="image"
                :width="136"
                :height="136"
                img-loading="lazy"
                class="aspect-square rounded-lg object-cover"
                :class="isMobileOrTablet ? `
                  h-16 w-16
                  sm:h-20 sm:w-20
                ` : 'w-full'"
              />
              <span
                v-if="activeIndex === index"
                class="
                  absolute inset-0 flex aspect-square items-center
                  justify-center rounded-lg bg-primary-500/20 ring-2
                  ring-primary-500
                "
              />
            </UButton>
          </div>
        </div>

        <div
          class="
            mt-2 flex items-center justify-center gap-2 text-xs
            dark:text-white/50
          "
          :class="isMobileOrTablet ? 'text-black/50' : `
            text-black/70
            dark:text-white/70
          `"
        >
          <UIcon
            :name="isMobileOrTablet ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-magnifying-glass-plus'"
            class="h-4 w-4"
          />
          <span>{{ isMobileOrTablet ? t('swipeHint') : t('hoverToMagnify') }}</span>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.touch-pinch-zoom {
  touch-action: pinch-zoom;
}
</style>

<i18n lang="yaml">
el:
  first: Αρχή
  last: Τέλος
  productImage: Εικόνα προϊόντος {product}
  navigate: Πλοήγηση
  jump: Μετάβαση
  imageNumber: Εικόνα {number}
  viewImage: Προβολή εικόνας {number}
  previous: Προηγούμενη
  next: Επόμενη
  swipeHint: Σύρετε για πλοήγηση • Πιέστε για μεγέθυνση
  hoverToMagnify: Κλικ για μεγέθυνση
  close: Κλείσιμο
</i18n>
