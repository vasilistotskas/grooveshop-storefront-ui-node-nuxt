<script lang="ts" setup>
import { hasProtocol, joinURL } from 'ufo'

const props = defineProps<{
  title?: string
  artworks?: ResolvedImage[]
  /** Mobile/tablet variants; used instead of `artworks` when there are any. */
  mobileArtworks?: ResolvedImage[]
  /** Optional deep-link the banner navigates to (validated internal path or https URL). */
  link?: string
}>()

const { isMobileOrTablet } = useDevice()
const leadsPage = useLeadsPage()
const { t } = useStoreI18n('components/variants/webside/PageSection/HeroCarousel')

const config = useRuntimeConfig()
const tenantStore = useTenantStore()
const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

// Banner artwork is tenant DATA (layout section props) — there is
// deliberately no built-in default image: a hardcoded fallback here
// would put one store's promo on every tenant whose layout carries a
// prop-less hero_carousel. Empty props render nothing.
const mediaStreamBaseUrl = useMediaStreamBaseUrl()

/**
 * What the slot draws for an artwork: its source, the provider that serves it
 * and its description. A library image (`media/<schema>/uploads/...`) is
 * served by the media service, absolutized against the store's own origin
 * (`useMediaStreamBaseUrl`) so the preload names the URL the image uses; an
 * app image (`/img/...`) stays with IPX, as it always was. An artwork that is
 * gone has no source.
 */
const drawn = (item: ResolvedImage): { src: string, provider?: 'mediaStream', alt: string } => {
  const image = readyImage(item)
  if (!image?.path) return { src: '', alt: '' }
  const alt = image.alt || appTitle.value
  if (!isMediaStreamSrc(image.path)) return { src: image.path, alt }
  return { src: hasProtocol(image.path) ? image.path : joinURL(mediaStreamBaseUrl.value, image.path), provider: 'mediaStream', alt }
}

/**
 * The slides: the phone's artworks on a phone that has any to draw, else the
 * desk's. An artwork that is gone is left out (an empty slide would hide the
 * ones after it and keep its link), and with none left the band draws nothing.
 */
const drawable = (list: readonly ResolvedImage[] | undefined) => (list ?? []).map(drawn).filter(slide => slide.src)
const slides = computed(() => {
  const mobile = isMobileOrTablet.value ? drawable(props.mobileArtworks) : []
  return mobile.length ? mobile : drawable(props.artworks)
})

const bannerWidth = computed(() => isMobileOrTablet.value ? 510 : 1194)
const bannerHeight = computed(() => isMobileOrTablet.value ? 638 : 418)
</script>

<template>
  <UCarousel
    v-if="slides.length"
    v-slot="{ item }"
    :items="slides"
    :ui="{ item: 'basis-full place-items-center justify-center' }"
    :aria-label="t('carousel.banner')"
    class="
      w-full
      md:p-0!
    "
    indicators
  >
    <NuxtLink
      v-if="link"
      :to="link"
      :aria-label="t('carousel.bannerLink')"
      class="block"
    >
      <NuxtImg
        :alt="item.alt"
        :src="item.src"
        :provider="item.provider"
        :height="bannerHeight"
        :width="bannerWidth"
        densities="x1"
        fit="cover"
        quality="80"
        format="webp"
        class="rounded-lg"
        style="object-fit: contain; content-visibility: auto;"
        :loading="leadsPage ? 'eager' : 'lazy'"
        :fetchpriority="leadsPage ? 'high' : undefined"
        decoding="async"
        :preload="leadsPage ? { fetchPriority: 'high' } : false"
      />
    </NuxtLink>
    <NuxtImg
      v-else
      :alt="item.alt"
      :src="item.src"
      :provider="item.provider"
      :height="bannerHeight"
      :width="bannerWidth"
      densities="x1"
      fit="cover"
      quality="80"
      format="webp"
      class="rounded-lg"
      style="object-fit: contain; content-visibility: auto;"
      :loading="leadsPage ? 'eager' : 'lazy'"
      :fetchpriority="leadsPage ? 'high' : undefined"
      decoding="async"
      :preload="leadsPage ? { fetchPriority: 'high' } : false"
    />
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
