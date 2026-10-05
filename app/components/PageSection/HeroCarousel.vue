<script lang="ts" setup>
/**
 * The top of a page, as more than one promise.
 *
 * One ink card inside the store's measure: on a desk the copy takes the
 * left five twelfths and the photograph the rest; on a phone the
 * photograph sits on top and the copy under it, so the copy is never
 * squeezed into the artwork's box. The copy is set in the inverted
 * surface's own text tokens, so it is readable by construction on every
 * artwork and in both colour schemes.
 *
 * The FIRST slide's heading is the page's h1 (`heroCarouselHeading` in
 * `shared/pageSections.ts` is the same rule, read by the page so it
 * stands its own h1 down); the later slides' are h2s.
 *
 * The carousel follows the ten requirements Baymard's testing puts on
 * a homepage carousel (baymard.com/blog/homepage-carousel): the first
 * slide is the operator's; every slide carries its own link; the
 * controls are always visible on a desk — a chip per slide, named after
 * it, and a previous/next pair — and the badge says "1 / 3"; autoplay
 * runs only where a pointer can pause it (`hover: hover`), pauses on
 * hover and stops for good once the visitor touches a control; a phone
 * never autorotates, swipes, and reads its own crop (`mobileImageUrl`).
 *
 * `slides` wins when present. The flat `images`/`mobileImages`/`link`
 * triple is the artwork-only carousel — wording baked into the
 * artwork, one link for the whole thing — and draws the photograph
 * alone at the chosen `aspect`.
 *
 * A slide that names a `productId` carries a chip on its photograph —
 * the product's picture, name and price, linking to it — as the design
 * draws the home hero. A product that cannot be read leaves that slide
 * without one.
 *
 * This is the page's LCP, so the FIRST slide's artwork loads eagerly at
 * high priority and the rest do not.
 */
interface HeroSlide {
  imageUrl: string
  mobileImageUrl?: string
  alt?: string
  eyebrow?: string
  heading?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  productId?: number
}

const props = withDefaults(defineProps<{
  title?: string
  /** Full editorial slides; wins over the flat props below. */
  slides?: HeroSlide[]
  images?: string[]
  /** Mobile/tablet variants (matching indices); falls back to `images`. */
  mobileImages?: string[]
  /** Deep-link for the flat form, where a slide carries no link of its own. */
  link?: string
  /** 0 = no autoplay. */
  autoplayMs?: number
  /** The photograph's shape; a phone gets the taller crop of each. */
  aspect?: 'wide' | 'banner' | 'square'
}>(), {
  aspect: 'wide',
})

const { isMobileOrTablet } = useDevice()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { productUrl } = useUrls()
const { formatPrice } = usePriceFormat()

const config = useRuntimeConfig()
const tenantStore = useTenantStore()
const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

const carousel = useTemplateRef('carousel')

/**
 * One shape downstream. The flat form becomes a slide with artwork and
 * nothing else, so the template never asks which form it was given.
 */
const items = computed<HeroSlide[]>(() => {
  if (props.slides?.length) return props.slides
  const flat = props.images ?? []
  const mobile = props.mobileImages ?? []
  return flat.map((imageUrl, index) => ({
    imageUrl,
    mobileImageUrl: mobile[index],
    ctaLink: props.link,
  }))
})

const several = computed(() => items.value.length > 1)

const chipProducts = await useHeroProductChips(
  () => items.value.flatMap(slide => (slide.productId ? [slide.productId] : [])),
)

/** Each slide's chip, or `undefined` where it names no readable product. */
const chips = computed(() => items.value.map((slide) => {
  const product = slide.productId ? chipProducts.value[slide.productId] : undefined
  if (!product) return undefined
  const was = productWasPrice(product, product.finalPrice)
  return {
    to: localePath(productUrl(product.id, product.slug)),
    image: product.mainImagePath,
    name: extractTranslated(product, 'name', locale.value) ?? '',
    price: formatPrice(product.finalPrice),
    was: was ? formatPrice(was) : undefined,
  }
}))

const artwork = (slide: HeroSlide) =>
  (isMobileOrTablet.value && slide.mobileImageUrl) || slide.imageUrl

const hasCopy = (slide: HeroSlide) =>
  !!(slide.eyebrow || slide.heading?.trim() || slide.subheading || slide.ctaText)

/** Whether any slide carries copy — the card then has a copy column. */
const editorial = computed(() => items.value.some(hasCopy))

/**
 * The photograph's box on a phone, and the crop requested to fill it —
 * one table so the two cannot drift. An artwork-only slide keeps its
 * shape on a desk too (`desk`); an editorial slide's photograph fills
 * the card's right seven twelfths instead, whatever its height, so it
 * asks for that column's shape (`EDITORIAL_DESK_CROP`). The pixel sizes
 * are the crop's SHAPE at its largest 1x width: `sizes` below makes
 * `NuxtImg` emit a width-based `srcset` from them, so a 3x phone gets a
 * sharp image and a desktop does not download pixels it never paints.
 * Classes stay literal strings so Tailwind sees them.
 */
const ASPECTS = {
  wide: { class: 'aspect-[6/5]', desk: 'lg:aspect-[16/10]', phone: [768, 640], deskCrop: [1216, 760] },
  banner: { class: 'aspect-video', desk: 'lg:aspect-[2/1]', phone: [768, 432], deskCrop: [1216, 608] },
  square: { class: 'aspect-square', desk: 'lg:aspect-square', phone: [768, 768], deskCrop: [1216, 1216] },
} as const satisfies Record<NonNullable<typeof props.aspect>, {
  class: string
  desk: string
  phone: readonly [number, number]
  deskCrop: readonly [number, number]
}>

/** The copy-beside-photograph column at the card's full 600px height. */
const EDITORIAL_DESK_CROP = [720, 600] as const

const aspect = computed(() => ASPECTS[props.aspect])

/**
 * The crop is a device-class choice for the same reason the artwork is:
 * a phone and a desk frame the photograph differently, a choice
 * `srcset` cannot express. The WIDTH within that crop is the browser's,
 * through `sizes`.
 */
const crop = (slide: HeroSlide) => {
  if (isMobileOrTablet.value) return aspect.value.phone
  return hasCopy(slide) ? EDITORIAL_DESK_CROP : aspect.value.deskCrop
}

/**
 * How wide the photograph renders: the card's width on a phone, and
 * from `lg` the 7/12 column beside the copy — capped at the container's
 * measure, which the card reaches at 1312px.
 */
const imageSizes = (slide: HeroSlide) =>
  hasCopy(slide) ? 'xs:100vw lg:56vw xl:710px' : 'xs:100vw xl:1216px'

/**
 * The buttons are a size down on a phone, and the main one drops its
 * arrow, as the design draws them;
 * a device-class choice like the crop, so the server renders the size
 * the visitor sees.
 */
const ctaSize = computed(() => (isMobileOrTablet.value ? 'md' : 'lg'))
const ctaIcon = computed(() => (isMobileOrTablet.value ? undefined : 'i-heroicons-arrow-right'))

/**
 * Autorotation is opt-in, refused under reduced motion, and only ever
 * runs where a pointer can pause it: a phone has no hover, so a slide
 * that moves on its own there changes under the reader's thumb.
 * `stopOnMouseEnter` is the pause and `stopOnInteraction` the stop for
 * a drag; a control stops it explicitly (`go`), because the controls
 * sit outside the slides Embla watches. Both media queries are
 * client-only by construction, which also keeps the plugin off the
 * server render.
 */
const reducedMotion = import.meta.client
  ? useMediaQuery('(prefers-reduced-motion: reduce)')
  : ref(false)
const canHover = import.meta.client
  ? useMediaQuery('(hover: hover) and (pointer: fine)')
  : ref(false)

const autoplay = computed(() =>
  props.autoplayMs && props.autoplayMs > 0 && !reducedMotion.value && canHover.value
    ? { delay: props.autoplayMs, stopOnMouseEnter: true, stopOnInteraction: true }
    : false,
)

const selected = ref(0)
const onSelect = (index: number) => {
  selected.value = index
}

/** Moves to a slide on the visitor's word, and stops the clock for good. */
const go = (move: 'prev' | 'next' | number) => {
  const embla = carousel.value?.emblaApi
  if (!embla) return
  embla.plugins().autoplay?.stop()
  if (move === 'prev') embla.scrollPrev()
  else if (move === 'next') embla.scrollNext()
  else embla.scrollTo(move)
}

/** What a slide's chip says: its eyebrow, or its place in the run. */
const chipLabel = (slide: HeroSlide, index: number) =>
  slide.eyebrow || String(index + 1)

const headingTag = (index: number) => (index === 0 ? 'h1' : 'h2')

const carouselUi = {
  // The card. `overflow-hidden` clips each slide to the radius, and
  // without it the document takes the widest slide. The theme spaces
  // slides with a negative start margin on the container and a start
  // padding on each item; a card-wide slide wants neither. Items
  // stretch, and each slide fills its item (`h-full`), so every slide
  // is the height of the tallest and the controls stay where they are
  // as the slides change.
  root: 'w-full overflow-hidden rounded-[1.625rem] bg-inverted text-inverted lg:rounded-[2rem]',
  container: 'ms-0 items-stretch',
  item: 'basis-full ps-0',
}

/**
 * The chips and the arrows sit on the inverted surface, so they are
 * drawn in its tokens: the current chip is the page surface on it (a
 * white pill on ink), the rest are an outline in the surface's text
 * colour. Both hold in dark mode, where the surface is light.
 */
const ON_CARD_OUTLINE = `
  bg-transparent text-inverted ring-(--ui-text-inverted)/25
  hover:bg-(--ui-text-inverted)/10 hover:ring-(--ui-text-inverted)/40
  active:bg-(--ui-text-inverted)/10
`
/** A chip that is not the current slide reads a step quieter than a button. */
const ON_CARD_CHIP = `${ON_CARD_OUTLINE} text-inverted/80`
const ON_CARD_CURRENT = 'bg-default text-highlighted hover:bg-default active:bg-default'
</script>

<template>
  <div
    v-if="items.length"
    class="
      pt-4 pb-2
      lg:pt-6
    "
  >
    <UContainer>
      <div class="relative">
        <UCarousel
          ref="carousel"
          v-slot="{ item, index }"
          :items="items"
          :ui="carouselUi"
          :aria-label="t('carousel.banner')"
          :autoplay="autoplay"
          :loop="several"
          @select="onSelect"
        >
          <div
            :class="[
              'grid h-full w-full grid-rows-[auto_1fr]',
              hasCopy(item) && 'lg:min-h-150 lg:grid-cols-[5fr_7fr] lg:grid-rows-1',
            ]"
          >
            <div
              :class="[
                'relative overflow-hidden bg-elevated',
                aspect.class,
                hasCopy(item) ? 'lg:order-2 lg:aspect-auto' : aspect.desk,
              ]"
            >
              <ImgWithFallback
                :src="artwork(item)"
                :alt="item.alt || item.heading || appTitle"
                :width="crop(item)[0]"
                :height="crop(item)[1]"
                :sizes="imageSizes(item)"
                class="absolute inset-0 size-full object-cover"
                fit="cover"
                quality="85"
                densities="x1 x2"
                :loading="index === 0 ? 'eager' : 'lazy'"
                :fetchpriority="index === 0 ? 'high' : 'auto'"
                :preload="index === 0"
              />

              <!-- The flat form's single link covers the photograph,
                   because there is no copy to put a button in. -->
              <NuxtLink
                v-if="!hasCopy(item) && item.ctaLink"
                :to="localePath(item.ctaLink)"
                :aria-label="t('carousel.bannerLink')"
                class="absolute inset-0"
              />

              <NuxtLink
                v-if="chips[index]"
                :to="chips[index]!.to"
                class="
                  absolute start-3 bottom-3 flex items-center gap-3.5 rounded-[1.125rem]
                  bg-default p-2.5 pe-4.5 shadow-lg
                  lg:start-7 lg:bottom-7
                "
              >
                <ImgWithFallback
                  :src="chips[index]!.image"
                  alt=""
                  :width="128"
                  :height="128"
                  fit="cover"
                  class="size-16 shrink-0 rounded-[0.875rem] bg-elevated object-cover"
                />
                <span class="flex min-w-0 flex-col gap-0.5">
                  <span class="text-sm font-bold text-highlighted">{{ chips[index]!.name }}</span>
                  <span class="flex flex-wrap items-baseline gap-2">
                    <span class="font-mono text-base font-bold text-highlighted tabular-nums">{{ chips[index]!.price }}</span>
                    <span
                      v-if="chips[index]!.was"
                      class="font-mono text-xs text-muted tabular-nums line-through"
                    >{{ chips[index]!.was }}</span>
                  </span>
                </span>
              </NuxtLink>
            </div>

            <div
              v-if="hasCopy(item)"
              class="
                flex flex-col px-5.5 pt-6 pb-6.5
                lg:px-14 lg:py-16
              "
            >
              <div
                class="
                  flex flex-col items-start gap-3.5
                  lg:gap-5.5
                "
              >
                <UBadge
                  v-if="item.eyebrow || several"
                  size="md"
                  color="neutral"
                  class="bg-volt text-on-volt"
                  :class="!item.eyebrow && 'max-lg:hidden'"
                >
                  <span v-if="item.eyebrow">{{ item.eyebrow }}</span>
                  <!-- The counter is the desk's: a phone swipes, and its
                       dots say the same thing. Read aloud as words, by
                       the line after the badge. The badge's own gap
                       spaces the parts. -->
                  <template v-if="several">
                    <span
                      v-if="item.eyebrow"
                      aria-hidden="true"
                      class="
                        hidden
                        lg:inline
                      "
                    >·</span>
                    <span
                      aria-hidden="true"
                      class="
                        hidden tabular-nums
                        lg:inline
                      "
                    >{{ index + 1 }} / {{ items.length }}</span>
                  </template>
                </UBadge>
                <span
                  v-if="several"
                  class="sr-only"
                >{{ t('carousel.position', { current: index + 1, total: items.length }) }}</span>

                <component
                  :is="headingTag(index)"
                  v-if="item.heading?.trim()"
                  class="
                    font-display text-[2.375rem]/[1.02] font-bold tracking-[-0.03em]
                    text-balance
                    sm:text-5xl/[1]
                    xl:text-[4.75rem]/[0.98] xl:tracking-[-0.035em]
                  "
                >
                  {{ item.heading }}
                </component>

                <p
                  v-if="item.subheading"
                  class="
                    max-w-105 text-[0.9375rem] text-pretty text-inverted/80
                    lg:text-[1.1875rem]
                  "
                >
                  {{ item.subheading }}
                </p>

                <div
                  v-if="(item.ctaText && item.ctaLink) || (item.secondaryCtaText && item.secondaryCtaLink)"
                  class="
                    flex flex-wrap items-center gap-2.5
                    lg:gap-3 lg:pt-1.5
                  "
                >
                  <UButton
                    v-if="item.ctaText && item.ctaLink"
                    :to="localePath(item.ctaLink)"
                    :label="item.ctaText"
                    :size="ctaSize"
                    color="neutral"
                    :trailing-icon="ctaIcon"
                    class="
                      bg-volt text-on-volt
                      hover:bg-volt/90
                      active:bg-volt/90
                    "
                  />
                  <UButton
                    v-if="item.secondaryCtaText && item.secondaryCtaLink"
                    :to="localePath(item.secondaryCtaLink)"
                    :label="item.secondaryCtaText"
                    :size="ctaSize"
                    color="neutral"
                    variant="outline"
                    :class="ON_CARD_OUTLINE"
                  />
                </div>
              </div>

              <!-- The bottom row of every panel. On a desk it is room for
                   the controls laid over it below (one set for the whole
                   carousel, so it does not slide away with its slide):
                   their 36px row under a 40px gap from the copy. On a
                   phone it carries this slide's place as dots. Kept for
                   a single slide too, so a hero that grows a second one
                   does not jump. -->
              <div
                class="
                  mt-auto flex items-center gap-1.5 pt-4.5
                  lg:h-19 lg:pt-0
                "
                aria-hidden="true"
              >
                <template v-if="several">
                  <span
                    v-for="dot in items.length"
                    :key="dot"
                    :class="[
                      'h-1.5 rounded-full lg:hidden',
                      dot - 1 === index ? 'w-5.5 bg-volt' : 'w-1.5 bg-(--ui-text-inverted)/30',
                    ]"
                  />
                </template>
              </div>
            </div>
          </div>
        </UCarousel>

        <!-- The desk's controls, laid over the copy column's bottom row:
             a chip per slide, named after it, then the previous/next
             pair. Outside the slides, so they stay put while the slides
             move; `go` stops the autoplay, which cannot see them. -->
        <div
          v-if="several"
          :class="[
            'absolute z-10 hidden items-center gap-3 lg:flex',
            editorial
              ? 'start-14 bottom-16 w-[calc((100%*5/12)-7rem)] justify-between'
              : 'end-6 bottom-6',
          ]"
        >
          <div
            v-if="editorial"
            role="group"
            :aria-label="t('carousel.slides')"
            class="flex min-w-0 flex-wrap gap-2"
          >
            <UButton
              v-for="(slide, index) in items"
              :key="index"
              :label="chipLabel(slide, index)"
              size="sm"
              color="neutral"
              :variant="selected === index ? 'solid' : 'outline'"
              :aria-current="selected === index ? 'true' : undefined"
              :class="selected === index ? ON_CARD_CURRENT : ON_CARD_CHIP"
              @click="() => go(index)"
            />
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <UButton
              icon="i-heroicons-arrow-left"
              size="sm"
              color="neutral"
              variant="outline"
              square
              :aria-label="t('carousel.prev')"
              :class="ON_CARD_OUTLINE"
              @click="() => go('prev')"
            />
            <UButton
              icon="i-heroicons-arrow-right"
              size="sm"
              color="neutral"
              variant="outline"
              square
              :aria-label="t('carousel.next')"
              :class="ON_CARD_OUTLINE"
              @click="() => go('next')"
            />
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<i18n lang="yaml">
el:
  carousel:
    banner: Κύριο banner
    bannerLink: Άνοιγμα συνδέσμου banner
    position: Διαφάνεια {current} από {total}
    slides: Επιλογή διαφάνειας
    prev: Προηγούμενη διαφάνεια
    next: Επόμενη διαφάνεια
en:
  carousel:
    banner: Main banner
    bannerLink: Open banner link
    position: Slide {current} of {total}
    slides: Choose a slide
    prev: Previous slide
    next: Next slide
</i18n>
