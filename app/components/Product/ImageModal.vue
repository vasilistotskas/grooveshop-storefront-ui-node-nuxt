<script setup lang="ts">
/**
 * The full-screen photo viewer the gallery's zoom opens.
 *
 * Dark in both colour modes, as a photo viewer is: the position and the
 * close button along the top, the photograph as large as the screen
 * allows with the arrows beside it, and the thumbnails along the bottom.
 * A click (or tap) on the photograph magnifies it 2.5x around the
 * pointer and the pointer then pans it; a second click lets go. While it
 * is magnified the carousel stops taking drags, so panning does not
 * swipe to the next photograph.
 */
const props = defineProps<{
  images: ProductImage[]
  initialIndex: number
  productName: string
}>()

const open = defineModel<boolean>({ required: true })

const { t } = useI18n()

const carousel = useTemplateRef('carousel')
const active = ref(props.initialIndex)
const zoomed = ref(false)

// The active photograph fills the carousel's viewport, so the pointer's
// place in the viewport is its place in the photograph.
const viewport = computed(() => carousel.value?.emblaRef)
const { elementX, elementY, elementWidth, elementHeight } = useMouseInElement(viewport)
const zoomOrigin = computed(() => {
  if (!elementWidth.value || !elementHeight.value) return 'center'
  const x = Math.min(100, Math.max(0, (elementX.value / elementWidth.value) * 100))
  const y = Math.min(100, Math.max(0, (elementY.value / elementHeight.value) * 100))
  return `${x}% ${y}%`
})

const hasMany = computed(() => props.images.length > 1)

function go(index: number) {
  if (index < 0 || index >= props.images.length) return
  carousel.value?.emblaApi?.scrollTo(index)
}

function onSelect(index: number) {
  active.value = index
  zoomed.value = false
}

defineShortcuts({
  arrowleft: { usingInput: false, handler: () => go(active.value - 1) },
  arrowright: { usingInput: false, handler: () => go(active.value + 1) },
  home: { usingInput: false, handler: () => go(0) },
  end: { usingInput: false, handler: () => go(props.images.length - 1) },
})

// The square the photograph fills: the screen's width on a phone, and
// never taller than what the bars above and below leave of its height.
const FRAME = `
  w-[min(100vw,calc(100dvh_-_11rem),42.5rem)]
  lg:w-[min(calc(100vw_-_10rem),calc(100dvh_-_11rem),42.5rem)]
`

const ARROW = 'bg-transparent text-white ring-white/20 hover:bg-white/10 disabled:opacity-30'
</script>

<template>
  <UModal
    v-model:open="open"
    :title="productName"
    :description="t('position', { current: active + 1, total: images.length })"
    fullscreen
    :ui="{ content: 'flex flex-col bg-neutral-950 text-white' }"
  >
    <template #content>
      <div class="flex items-center justify-between px-5 py-4">
        <span
          class="font-mono text-sm"
          aria-hidden="true"
        >{{ active + 1 }} / {{ images.length }}</span>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="outline"
          square
          :aria-label="t('close')"
          :class="ARROW"
          @click="() => { open = false }"
        />
      </div>

      <div
        class="
          flex min-h-0 flex-1 items-center justify-center gap-5
          lg:px-5
        "
      >
        <UButton
          v-if="hasMany"
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          square
          :disabled="active === 0"
          :aria-label="t('previous')"
          :class="[ARROW, 'max-lg:hidden']"
          @click="go(active - 1)"
        />

        <UCarousel
          ref="carousel"
          v-slot="{ item }"
          :items="images"
          :start-index="initialIndex"
          :watch-drag="!zoomed"
          :class="FRAME"
          :ui="{ container: 'ms-0', item: 'ps-0' }"
          @select="onSelect"
        >
          <div
            class="
              aspect-square overflow-hidden
              lg:rounded-[1.25rem]
            "
          >
            <ProductImage
              :image="item"
              :width="680"
              :height="680"
              img-loading="eager"
              class="size-full object-cover transition-transform duration-200 select-none"
              :class="zoomed && item === images[active] ? 'scale-[2.5] cursor-zoom-out' : 'cursor-zoom-in'"
              :style="zoomed && item === images[active] ? { transformOrigin: zoomOrigin } : undefined"
              draggable="false"
              @click="() => { zoomed = !zoomed }"
            />
          </div>
        </UCarousel>

        <UButton
          v-if="hasMany"
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          square
          :disabled="active === images.length - 1"
          :aria-label="t('next')"
          :class="[ARROW, 'max-lg:hidden']"
          @click="go(active + 1)"
        />
      </div>

      <div
        v-if="hasMany"
        class="flex justify-center gap-2 overflow-x-auto p-4"
      >
        <button
          v-for="(image, index) in images"
          :key="image.id"
          type="button"
          :aria-label="t('show_image', { number: index + 1 })"
          :aria-current="active === index ? 'true' : undefined"
          class="
            size-13 shrink-0 cursor-pointer overflow-hidden rounded-[0.75rem]
            opacity-50 outline-offset-2 transition-opacity
            hover:opacity-80
            aria-[current=true]:opacity-100 aria-[current=true]:outline-2
            aria-[current=true]:outline-white
            focus-visible:opacity-100 focus-visible:outline-2
            focus-visible:outline-white
          "
          @click="go(index)"
        >
          <ProductImage
            :image="image"
            :width="52"
            :height="52"
            img-loading="lazy"
            class="size-full object-cover"
          />
        </button>
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  position: Εικόνα {current} από {total}
  show_image: Εικόνα {number}
  previous: Προηγούμενη εικόνα
  next: Επόμενη εικόνα
  close: Κλείσιμο
en:
  position: Image {current} of {total}
  show_image: Image {number}
  previous: Previous image
  next: Next image
  close: Close
</i18n>
