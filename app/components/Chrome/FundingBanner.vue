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
 */
const { framed = false } = defineProps<{
  framed?: boolean
}>()

const { t } = useI18n()

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
  // A strip with neither artwork nor words is a blank band.
  if (!parsed.enabled || (!parsed.image && !parsed.label)) return null
  return parsed
})

// An absolute URL is not ours to resize: IPX only proxies the origins it
// is configured for, so the artwork is passed through as it is.
const provider = computed(() =>
  banner.value?.image?.startsWith('https://') ? 'none' : undefined,
)

// A strip without a link is plain markup; with one it is ONE link around
// the artwork and the label (a second link to the same page is noise).
const NuxtLink = resolveComponent('NuxtLink')
const wrapper = computed(() => (banner.value?.link ? NuxtLink : 'div'))
const wrapperProps = computed(() =>
  banner.value?.link ? { to: banner.value.link } : {},
)

// The artwork's rendered width, the figure the EU emblem sizing rule in
// the design is measured against: 560px in the strip, 760px in a footer.
const width = computed(() => (framed ? 760 : 560))
</script>

<template>
  <component
    :is="framed ? 'div' : 'aside'"
    v-if="banner"
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
          :style="{ width: `min(${width}px, 100%)` }"
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
</template>

<i18n lang="yaml">
el:
  label: Συγχρηματοδότηση από την Ευρωπαϊκή Ένωση
en:
  label: Co-funded by the European Union
</i18n>
