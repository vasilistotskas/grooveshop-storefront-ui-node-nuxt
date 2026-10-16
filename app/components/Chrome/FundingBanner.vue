<script lang="ts" setup>
/**
 * The EU / ΕΣΠΑ co-funding strip: the operation's official artwork, one
 * link to its description, and an optional line of text beside it.
 *
 * Rendered from the ``FUNDING_BANNER`` setting on the SERVER and
 * identically for every visitor, so it stays compatible with the cached
 * anonymous render. Fails silent like the announcement bar: no setting,
 * a disabled one, malformed JSON or a shape the guard rejects render
 * nothing.
 *
 * The ground is WHITE in both colour modes, deliberately: the official
 * artwork is drawn on white, so a dark page does not get a dark strip.
 * The link colour is a fixed AA blue for the same reason. That is why
 * this component takes no tenant colours and imports no tenant CSS.
 *
 * The strip is an ``aside`` named for what it is, so it sits inside a
 * landmark instead of loose between the skip link and the header. The
 * ``framed`` copy lives inside the footer's own landmark, where a
 * complementary region would nest, so it stays a plain box.
 *
 * ``framed`` is the same banner as a white rounded box, for a footer.
 *
 * The strip also keeps the logos on screen while the visitor reads: its
 * FLOATING twin, a bar along the bottom of a phone and a card in the
 * corner of a desk, shows exactly while no in-page copy (this strip or a
 * footer's box) is on screen (``useFundingBannerVisibility``), so the
 * logos are always in view and never twice. The twin is a visual
 * duplicate: hidden from assistive technology and out of the tab order,
 * since the strip and the box already carry the same link for them. It is
 * rendered by the strip rather than the layout so that a store with no
 * banner renders exactly what it did before.
 */
const { framed = false } = defineProps<{
  framed?: boolean
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { floating, track } = useFundingBannerVisibility()

const raw = useSettingValue('FUNDING_BANNER')

const banner = computed(() => {
  const value = raw.value
  if (!value || value === '{}') return null
  const parsed = parseFundingBannerValue(value)
  if (!parsed) {
    log.warn({
      tag: 'funding-banner',
      message: 'FUNDING_BANNER setting failed shape validation',
    })
    return null
  }
  // The locale's own artwork and words: the programme publishes the
  // strip per language.
  const localized = localizedFundingBanner(parsed, locale.value)
  // A strip with neither artwork nor words is a blank band.
  if (!localized.enabled || (!localized.image && !localized.label)) return null
  return localized
})

track(useTemplateRef<HTMLElement>('copy'))

// On a phone the floating twin is the bottom edge of the screen. Its
// height depends on the artwork, so it is measured and handed to the
// bottom dock (`--dock-edge` in main.css), which stacks the corner
// buttons above it; the accessibility button used to cover the logos.
// The variable only counts while the strip is on screen (`:has`).
useResizeObserver(useTemplateRef<HTMLElement>('floatingStrip'), ([entry]) => {
  if (!entry) return
  document.documentElement.style.setProperty(
    '--funding-strip-height',
    `${entry.borderBoxSize[0]?.blockSize ?? entry.target.getBoundingClientRect().height}px`,
  )
})

// An absolute URL is not ours to resize: IPX only proxies the origins it
// is configured for, so the artwork is passed through as it is.
const provider = computed(() =>
  banner.value?.image?.startsWith('https://') ? 'none' : undefined,
)

// A strip without a link is plain markup; with one it is ONE link around
// the artwork and the label (a second link to the same page is noise).
// A path is the operation's page in the visitor's language, so it gets
// the locale prefix; an https URL is someone else's and is left alone.
const NuxtLink = resolveComponent('NuxtLink')
const wrapper = computed(() => (banner.value?.link ? NuxtLink : 'div'))
const wrapperProps = computed(() => {
  const link = banner.value?.link
  if (!link) return {}
  return { to: link.startsWith('https://') ? link : localePath(pathLocation(link)) }
})

// The artwork's rendered width, the figure the EU emblem sizing rule in
// the design is measured against: 560px in the strip, 760px in a footer.
const width = computed(() => (framed ? 760 : 560))
// The floating twin's: at most 420px on a phone, 340px in a desk corner.
const FLOATING_WIDTH = 420

// The artwork's own proportions, so its box is drawn at the final size
// before the image arrives: the strip is the first thing on the page, and
// without it every byte of the artwork pushed the page down (CLS).
const aspectRatio = computed(() =>
  banner.value?.image
    ? `${banner.value.width} / ${banner.value.height}`
    : undefined,
)
</script>

<template>
  <template v-if="banner">
    <component
      :is="framed ? 'div' : 'aside'"
      ref="copy"
      :aria-label="framed ? undefined : t('label')"
      :class="framed
        ? 'rounded-2xl bg-white p-3'
        : 'border-b border-neutral-200 bg-white'"
    >
      <div
        :class="framed
          ? ''
          : `
            mx-auto w-full max-w-(--ui-container) px-4 py-2
            sm:px-6
            lg:px-8
          `"
      >
        <component
          :is="wrapper"
          v-bind="wrapperProps"
          class="
            flex flex-wrap items-center gap-x-6 gap-y-1 rounded-sm text-blue-800
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-blue-800
          "
          :class="framed ? 'justify-center' : 'justify-between'"
        >
          <ImgWithFallback
            v-if="banner.image"
            :src="banner.image"
            :alt="banner.alt"
            :provider="provider"
            :width="width"
            densities="x1 x2"
            quality="90"
            fallback=""
            class="block h-auto"
            :style="{ width: `min(${width}px, 100%)`, aspectRatio }"
          />
          <span
            v-if="banner.label"
            class="
              inline-flex min-h-11 items-center text-[13.5px] font-semibold
              underline underline-offset-4
            "
          >{{ banner.label }}</span>
        </component>
      </div>
    </component>

    <div
      v-if="!framed && floating"
      ref="floatingStrip"
      data-funding-floating
      aria-hidden="true"
      class="
        fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white
        px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]
        shadow-[0_-8px_24px_-12px_rgb(0_0_0/25%)]
        sm:inset-x-auto sm:bottom-4 sm:left-4 sm:rounded-xl sm:border sm:p-2
        sm:shadow-lg
      "
    >
      <component
        :is="wrapper"
        v-bind="wrapperProps"
        :tabindex="banner.link ? -1 : undefined"
        class="mx-auto block w-fit"
      >
        <ImgWithFallback
          v-if="banner.image"
          :src="banner.image"
          alt=""
          :provider="provider"
          :width="FLOATING_WIDTH"
          densities="x1 x2"
          quality="90"
          fallback=""
          class="block h-auto w-[min(420px,100%)] sm:w-[340px]"
          :style="{ aspectRatio }"
        />
        <span
          v-else
          class="text-[13.5px] font-semibold text-blue-800"
        >{{ banner.label }}</span>
      </component>
    </div>
  </template>
</template>

<i18n lang="yaml">
el:
  label: Συγχρηματοδότηση από την Ευρωπαϊκή Ένωση
en:
  label: Co-funded by the European Union
</i18n>
