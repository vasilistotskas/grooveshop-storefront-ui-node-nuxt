<script lang="ts" setup>
/**
 * The top of a page, as more than one promise.
 *
 * Two shapes, and the rich one had no implementation until now: the
 * schema, Django and the server proxy all carried `slides` — artwork
 * WITH its own copy and its own destination — while this component read
 * only the flat `images` array. `items.length` was 0, so a fully
 * configured hero rendered nothing at all. Caught on the demo store,
 * whose homepage opened on its second band.
 *
 * `slides` wins when present. The flat `images`/`mobileImages`/`link`
 * triple stays for layouts that predate it: one link for the whole
 * carousel and wording baked into the artwork.
 *
 * Structured like `HeroBanner` on purpose — the copy sits over the
 * photograph, `theme` says which way it reads, and a phone gets its own
 * crop rather than the same artwork squeezed. This is the page's LCP,
 * so the FIRST slide loads eagerly at high priority and the rest do not.
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
  theme?: 'light' | 'dark' | 'auto'
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

/** Copy over a photograph is light unless the slide says otherwise. */
const inverted = (slide: HeroSlide) => slide.theme !== 'light'

const hasCopy = (slide: HeroSlide) =>
  !!(slide.eyebrow || slide.heading || slide.subheading || slide.ctaText)

const aspectClass = computed(() => ({
  wide: 'aspect-[16/9] md:aspect-[21/9]',
  banner: 'aspect-[4/3] md:aspect-[3/1]',
  square: 'aspect-square md:aspect-[2/1]',
}[props.aspect]))

/**
 * Autoplay is opt-in AND refused under reduced motion: a hero that
 * moves on its own is the band most likely to make someone ill, and the
 * preference is the one place they have said so.
 */
const reducedMotion = import.meta.client
  ? useMediaQuery('(prefers-reduced-motion: reduce)')
  : ref(false)

const autoplay = computed(() =>
  props.autoplayMs && props.autoplayMs > 0 && !reducedMotion.value
    ? { delay: props.autoplayMs }
    : false,
)

const carouselUi = {
  // `overflow-hidden`: each slide is a full-bleed photograph that fills
  // its box, and without a clip the document takes the widest of them.
  root: 'w-full overflow-hidden',
  item: 'basis-full',
  // Grouped bottom-right, not on the sides. The copy is left-aligned
  // and vertically centred, so a left arrow at mid-height lands ON the
  // heading — measured at 1440 and 1024, it covered both the heading
  // and the subheading. The dots sit bottom-centre, so this corner is
  // the one free edge.
  //
  // The `sm:` twins are not decoration. UCarousel's own defaults hang
  // the arrows OUTSIDE the box from `sm` up (`sm:-start-12`,
  // `sm:-end-12`), and tailwind-merge does not treat a breakpoint class
  // as conflicting with an unprefixed one — so `start-auto` alone left
  // `sm:-start-12` standing. Above `sm` that gave the prev button
  // `left:-48px` AND `right:64px`, stretching it into a 1889px-wide
  // invisible strip across the hero, while next sat at `right:-48px`
  // where `overflow-hidden` above clipped it away entirely. Measured on
  // the demo store at 1920. Every inset set here needs its `sm:` twin
  // or the default wins at exactly the widths that matter.
  prev: `
    top-auto bottom-4 -translate-y-0
    start-auto end-16
    sm:start-auto sm:end-16
  `,
  next: `
    top-auto bottom-4 -translate-y-0
    start-auto end-4
    sm:start-auto sm:end-4
  `,
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
    :arrows="items.length > 1 && !isMobileOrTablet"
    :dots="items.length > 1"
    :loop="items.length > 1"
    class="w-full"
  >
    <section
      :class="['relative isolate w-full overflow-hidden', aspectClass]"
    >
      <ImgWithFallback
        :src="artwork(item)"
        :alt="item.alt || item.heading || appTitle"
        :width="isMobileOrTablet ? 768 : 2100"
        :height="isMobileOrTablet ? 960 : 900"
        class="absolute inset-0 size-full object-cover"
        fit="cover"
        quality="80"
        densities="x1"
        :loading="index === 0 ? 'eager' : 'lazy'"
        :fetchpriority="index === 0 ? 'high' : 'auto'"
        :preload="index === 0"
      />

      <!-- Only where there is copy to read: an overlay over artwork that
           carries its own wording just dulls it. -->
      <div
        v-if="hasCopy(item)"
        aria-hidden="true"
        class="absolute inset-0 bg-black/45"
      />

      <UContainer
        v-if="hasCopy(item)"
        class="
          relative flex size-full flex-col items-start justify-center gap-4
          text-start
        "
      >
        <p
          v-if="item.eyebrow"
          :class="[
            'text-xs font-semibold tracking-[0.14em] uppercase',
            inverted(item) ? 'text-white/80' : 'text-accent',
          ]"
        >
          {{ item.eyebrow }}
        </p>

        <h2
          v-if="item.heading"
          :class="[
            `
              font-display text-3xl font-bold text-balance
              md:text-5xl
            `,
            inverted(item) ? 'text-white' : 'text-highlighted',
          ]"
        >
          {{ item.heading }}
        </h2>

        <p
          v-if="item.subheading"
          :class="[
            'max-w-xl text-base text-pretty md:text-lg',
            inverted(item) ? 'text-white/90' : 'text-muted',
          ]"
        >
          {{ item.subheading }}
        </p>

        <div
          v-if="item.ctaText || item.secondaryCtaText"
          class="flex flex-wrap items-center gap-3 pt-2"
        >
          <UButton
            v-if="item.ctaText && item.ctaLink"
            :to="localePath(item.ctaLink)"
            :label="item.ctaText"
            color="secondary"
            size="xl"
          />
          <UButton
            v-if="item.secondaryCtaText && item.secondaryCtaLink"
            :to="localePath(item.secondaryCtaLink)"
            :label="item.secondaryCtaText"
            :color="inverted(item) ? 'neutral' : 'secondary'"
            :variant="inverted(item) ? 'subtle' : 'outline'"
            size="xl"
          />
        </div>
      </UContainer>

      <!-- The flat form's single link covers the whole slide, because
           there is no copy to put a button beside. -->
      <NuxtLink
        v-else-if="item.ctaLink"
        :to="localePath(item.ctaLink)"
        :aria-label="t('carousel.bannerLink')"
        class="absolute inset-0"
      />
    </section>
  </UCarousel>
</template>

<i18n lang="yaml">
el:
  carousel:
    banner: Κύριο banner
    bannerLink: Άνοιγμα συνδέσμου banner
en:
  carousel:
    banner: Main banner
    bannerLink: Open banner link
</i18n>
