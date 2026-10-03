<script lang="ts" setup>
/**
 * The product page's gallery: one large photograph on the sunken tile
 * with the product's badges and a zoom button, and the photographs as a
 * row of thumbnails under it.
 *
 * One carousel at every width rather than two galleries switched by
 * device: on a phone it runs edge to edge and swipes, with dots for its
 * position; from `lg` the thumbnails take over and the dots go. The
 * first photograph is the page's LCP element, so it alone loads eagerly
 * and is preloaded at the exact size the `<img>` asks for.
 */
const props = defineProps<{
  product: ProductDetail
  /** The name the page shows, which the zoom viewer is titled with. */
  productName: string
}>()

const { t, locale } = useI18n()

const { data: images } = await useApi(
  `/api/products/${props.product.id}/images`,
  {
    key: `productImages${props.product.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

/** The main photograph first, the rest in the order the store set. */
const slides = computed(() => {
  const all = images.value ?? []
  const main = all.find(image => image.isMain)
  return main ? [main, ...all.filter(image => image !== main)] : all
})

const carousel = useTemplateRef('carousel')
const selected = ref(0)
const zoomOpen = ref(false)

function show(index: number) {
  carousel.value?.emblaApi?.scrollTo(index)
}

function openZoom() {
  if (slides.value.length) zoomOpen.value = true
}

const discount = computed(() => Math.round(props.product.discountPercent ?? 0))
const soldOut = computed(() => (props.product.stock ?? 0) <= 0)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      class="
        relative overflow-hidden bg-elevated
        max-sm:-mx-4
        sm:rounded-[1.5rem]
      "
    >
      <UCarousel
        v-if="slides.length"
        ref="carousel"
        v-slot="{ item, index }"
        :items="slides"
        :dots="slides.length > 1"
        :aria-label="t('gallery')"
        :ui="{
          container: 'ms-0',
          item: 'ps-0',
          dots: `
            bottom-4 gap-1.5
            lg:hidden
          `,
          dot: `
            size-1.5 bg-(--ui-text-highlighted)/25 transition-[width]
            data-[state=active]:w-5
            data-[state=active]:bg-(--ui-text-highlighted)
          `,
        }"
        @select="(index: number) => { selected = index }"
      >
        <!-- Clicking the photograph zooms as the button does; it is
             not a second tab stop, the button is the control. -->
        <ProductImage
          :image="item"
          :width="680"
          :height="680"
          :img-loading="index === 0 ? 'eager' : 'lazy'"
          :preload="index === 0"
          :fetchpriority="index === 0 ? 'high' : undefined"
          class="aspect-square w-full cursor-zoom-in object-cover"
          @click="openZoom"
        />
      </UCarousel>
      <ProductImage
        v-else
        :width="680"
        :height="680"
        class="aspect-square w-full object-cover"
      />

      <div class="absolute start-3.5 top-3.5 flex gap-1.5">
        <UBadge
          v-if="soldOut"
          :label="t('sold_out')"
          color="neutral"
          variant="soft"
        />
        <!-- U+2212, the minus sign the design sets, not a hyphen. -->
        <UBadge
          v-else-if="discount > 0"
          :label="`−${discount}%`"
          color="neutral"
          class="bg-volt text-on-volt"
        />
      </div>

      <UButton
        v-if="slides.length"
        icon="i-lucide-zoom-in"
        color="neutral"
        variant="outline"
        size="sm"
        square
        :aria-label="t('zoom')"
        class="absolute end-3.5 bottom-3.5"
        @click="openZoom"
      />
    </div>

    <div
      v-if="slides.length > 1"
      class="
        hidden grid-cols-5 gap-3
        lg:grid
      "
    >
      <!-- The chosen thumbnail's ring is ink, marked important: Volt colours
           every outline with the accent from an unlayered rule (main.css). -->
      <button
        v-for="(image, index) in slides"
        :key="image.id"
        type="button"
        :aria-label="t('show_image', { number: index + 1 })"
        :aria-current="selected === index ? 'true' : undefined"
        class="
          aspect-square cursor-pointer overflow-hidden rounded-[0.875rem]
          bg-elevated outline-offset-2
          aria-[current=true]:outline-2
          aria-[current=true]:outline-inverted!
          focus-visible:outline-2 focus-visible:outline-secondary
        "
        @click="show(index)"
      >
        <ProductImage
          :image="image"
          :width="132"
          :height="132"
          img-loading="lazy"
          class="size-full object-cover"
        />
      </button>
    </div>

    <LazyProductImageModal
      v-if="zoomOpen"
      v-model="zoomOpen"
      :images="slides"
      :initial-index="selected"
      :product-name="productName"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  gallery: Φωτογραφίες προϊόντος
  zoom: Μεγέθυνση εικόνας
  show_image: Εικόνα {number}
  sold_out: Εξαντλήθηκε
en:
  gallery: Product photos
  zoom: Zoom the image
  show_image: Image {number}
  sold_out: Sold out
</i18n>
