<script lang="ts" setup>
/**
 * The top of a page, as more than one promise.
 *
 * A slide is a PANEL beside a photograph, not copy over one. The copy
 * sits on the store's accent surface, in the accent's own foreground
 * token, so it is readable by construction — on every artwork, in both
 * colour schemes, for every tenant palette (`--ui-on-secondary` is
 * luminance-picked per tenant). On a desk the panel takes the left
 * five twelfths and the photograph the rest; on a phone the photograph
 * sits on top and the panel under it, so the copy is never squeezed
 * into the artwork's box. The previous overlay reading clipped both
 * CTAs at 390px (a 16/9 box is 219px tall, the copy was more) and put
 * white type over the light half of a photo — measured on the demo
 * store, 2026-09-22.
 *
 * The carousel follows the ten requirements Baymard's testing puts on
 * a homepage carousel (baymard.com/blog/homepage-carousel): the first
 * slide is the operator's; every slide is also reachable by scrolling
 * nothing else (each carries its own link); the controls are always
 * visible, inside the panel, with a "1 / 3" counter; autoplay runs only
 * where a pointer can pause it (`hover: hover`), pauses on hover and
 * stops for good after the visitor touches a control; a phone never
 * autorotates, swipes, and reads its own crop (`mobileImageUrl`).
 *
 * `slides` wins when present. The flat `images`/`mobileImages`/`link`
 * triple is the artwork-only carousel — wording baked into the
 * artwork, one link for the whole thing — and draws the photograph
 * alone at the chosen `aspect`.
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
const { t } = useI18n()
const localePath = useLocalePath()

const config = useRuntimeConfig()
const tenantStore = useTenantStore()
const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

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

const artwork = (slide: HeroSlide) =>
  (isMobileOrTablet.value && slide.mobileImageUrl) || slide.imageUrl

const hasCopy = (slide: HeroSlide) =>
  !!(slide.eyebrow || slide.heading || slide.subheading || slide.ctaText)

/**
 * The photograph's box. Below `lg` the panel sits under it, so the
 * phone crop is the taller of each pair; from `lg` the photograph is
 * the right column and the panel stretches to match it — or the other
 * way round when the copy is the taller of the two.
 */
const aspectClass = computed(() => ({
  wide: 'aspect-4/3 lg:aspect-[16/10]',
  banner: 'aspect-video lg:aspect-[2/1]',
  square: 'aspect-square lg:aspect-square',
}[props.aspect]))

/**
 * Autorotation is opt-in, refused under reduced motion, and only ever
 * runs where a pointer can pause it: a phone has no hover, so a slide
 * that moves on its own there changes under the reader's thumb.
 * `stopOnMouseEnter` is the pause; `stopOnInteraction` is the stop —
 * once the visitor has touched a control they are reading, not
 * waiting. Both are client-only by construction, which also keeps
 * the plugin off the server render.
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

const carouselUi = {
  // `overflow-hidden`: each slide fills its box, and without a clip
  // the document takes the widest of them. The theme spaces slides
  // with a negative start margin on the container and a start padding
  // on each item; a full-bleed slide wants neither, or it is 16px
  // narrower than the viewport and leaves a strip of ground on the
  // right.
  root: 'w-full overflow-hidden',
  container: 'ms-0',
  item: 'basis-full ps-0',
  // The arrows sit as a pair at the panel's bottom-left, where the
  // counter in every panel leaves room for them — the same corner on
  // a desk (the panel is the left column) and on a phone (the panel
  // is the bottom row). `static` takes them out of the carousel's own
  // absolute placement; every inset the theme sets needs its `sm:`
  // twin overridden too, or the default wins at exactly the widths
  // that matter (the theme hangs them OUTSIDE the box from `sm` up).
  arrows: `
    absolute start-6 bottom-6 z-10 flex items-center gap-2
    sm:start-8 sm:bottom-8
    lg:start-12 lg:bottom-12
  `,
  prev: `
    static top-auto start-auto end-auto translate-y-0
    sm:static sm:start-auto sm:end-auto
  `,
  next: `
    static top-auto start-auto end-auto translate-y-0
    sm:static sm:start-auto sm:end-auto
  `,
}

const arrowButton = {
  color: 'neutral' as const,
  variant: 'solid' as const,
  size: 'md' as const,
  square: true,
}
</script>

<template>
  <UCarousel
    v-if="items.length"
    v-slot="{ item, index }"
    :items="items"
    :ui="carouselUi"
    :aria-label="t('carousel.banner')"
    :autoplay="autoplay"
    :arrows="items.length > 1"
    :prev="arrowButton"
    :next="arrowButton"
    :loop="items.length > 1"
    class="w-full"
  >
    <section
      :class="[
        'grid w-full',
        hasCopy(item) && 'lg:grid-cols-12',
      ]"
    >
      <div
        :class="[
          'relative overflow-hidden bg-elevated',
          aspectClass,
          hasCopy(item) && 'lg:col-span-7 lg:order-2',
        ]"
      >
        <ImgWithFallback
          :src="artwork(item)"
          :alt="item.alt || item.heading || appTitle"
          :width="isMobileOrTablet ? 768 : 1280"
          :height="isMobileOrTablet ? 576 : 800"
          class="absolute inset-0 size-full object-cover"
          fit="cover"
          quality="80"
          densities="x1"
          :loading="index === 0 ? 'eager' : 'lazy'"
          :fetchpriority="index === 0 ? 'high' : 'auto'"
          :preload="index === 0"
        />

        <!-- The flat form's single link covers the photograph, because
             there is no panel to put a button in. -->
        <NuxtLink
          v-if="!hasCopy(item) && item.ctaLink"
          :to="localePath(item.ctaLink)"
          :aria-label="t('carousel.bannerLink')"
          class="absolute inset-0"
        />
      </div>

      <!-- The panel's padding is the arrows' inset (`carouselUi.arrows`),
           step for step, so the bottom row lands exactly where the
           arrows are pinned. -->
      <div
        v-if="hasCopy(item)"
        class="
          flex flex-col bg-(--ui-secondary) p-6 text-(--ui-on-secondary)
          sm:p-8
          lg:col-span-5 lg:p-12
        "
      >
        <div
          class="
            my-auto flex flex-col gap-4
            lg:gap-5
          "
        >
          <p
            v-if="item.eyebrow"
            class="text-sm font-medium"
          >
            {{ item.eyebrow }}
          </p>

          <h2
            v-if="item.heading"
            class="
              font-display text-3xl font-semibold tracking-tight text-balance
              sm:text-4xl
              xl:text-5xl
            "
          >
            {{ item.heading }}
          </h2>

          <p
            v-if="item.subheading"
            class="max-w-xl text-base text-pretty md:text-lg"
          >
            {{ item.subheading }}
          </p>

          <div
            v-if="(item.ctaText && item.ctaLink) || (item.secondaryCtaText && item.secondaryCtaLink)"
            class="flex flex-wrap items-center gap-3 pt-2"
          >
            <UButton
              v-if="item.ctaText && item.ctaLink"
              :to="localePath(item.ctaLink)"
              :label="item.ctaText"
              color="neutral"
              size="xl"
            />
            <!-- `bg-transparent`: the outline variant paints the page
                 surface under its label, which on the accent panel is
                 a pale box with the panel's light text on it. -->
            <UButton
              v-if="item.secondaryCtaText && item.secondaryCtaLink"
              :to="localePath(item.secondaryCtaLink)"
              :label="item.secondaryCtaText"
              color="neutral"
              variant="outline"
              size="xl"
              class="
                bg-transparent text-(--ui-on-secondary)
                ring-(--ui-on-secondary)/40
                hover:bg-(--ui-on-secondary)/10
              "
            />
          </div>
        </div>

        <!-- The bottom row of every panel: room for the arrows, then
             where the visitor is. Rendered even for a single slide,
             as an empty row, so a page whose hero grows a second slide
             does not jump. -->
        <p
          class="
            mt-6 flex h-9 items-center text-sm font-medium tabular-nums
            lg:mt-8
          "
          :class="items.length > 1 && 'ps-22'"
        >
          <span
            v-if="items.length > 1"
            :aria-label="t('carousel.position', { current: index + 1, total: items.length })"
          >
            {{ index + 1 }} / {{ items.length }}
          </span>
        </p>
      </div>
    </section>
  </UCarousel>
</template>

<i18n lang="yaml">
el:
  carousel:
    banner: Κύριο banner
    bannerLink: Άνοιγμα συνδέσμου banner
    position: Διαφάνεια {current} από {total}
en:
  carousel:
    banner: Main banner
    bannerLink: Open banner link
    position: Slide {current} of {total}
</i18n>
