<script lang="ts" setup>
/**
 * The top of a page: one picture, one promise, one ask.
 *
 * Two readings, chosen by whether the operator gave it artwork:
 * - with an image, the copy sits over the photograph and `theme` says
 *   which way it reads;
 * - without, the band is typographic on the raised surface, and `decor`
 *   adds the orbs or the gradient wash behind it.
 *
 * A phone crops a hero differently from a desk, so `mobileImageUrl` is
 * a separate artwork rather than the same one squeezed. This is the
 * page's LCP: the image loads eagerly at high priority and carries
 * explicit dimensions.
 */
const props = withDefaults(defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  eyebrow?: string
  imageUrl?: string
  mobileImageUrl?: string
  imageAlt?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  /** Proof under the copy — "500+ orders", "24h delivery". */
  stats?: Array<{ value: string, label: string }>
  overlayOpacity?: number
  decor?: 'none' | 'orbs' | 'gradient'
  align?: 'left' | 'center'
  theme?: 'light' | 'dark' | 'auto'
}>(), {
  align: 'center',
  theme: 'auto',
})

const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()

const label = computed(() => props.heading || props.title)
const hasImage = computed(() => !!props.imageUrl)

const artwork = computed(() =>
  (isMobileOrTablet.value && props.mobileImageUrl) || props.imageUrl,
)

/**
 * Copy over a photograph is light by default, because the overlay
 * darkens the artwork underneath it. `auto` on a band with no artwork
 * means the page's own text colours.
 */
const inverted = computed(
  () => props.theme === 'dark' || (props.theme === 'auto' && hasImage.value),
)

const centred = computed(() => props.align === 'center')

/** A hero with neither copy nor artwork is not a band. */
const hasContent = computed(
  () => hasImage.value || !!label.value || !!props.subheading,
)
</script>

<template>
  <section
    v-if="hasContent"
    :class="[
      'relative isolate w-full overflow-hidden',
      hasImage ? 'bg-inverted' : 'bg-muted',
    ]"
  >
    <template v-if="hasImage">
      <ImgWithFallback
        :src="artwork"
        :alt="imageAlt || label || ''"
        :width="isMobileOrTablet ? 768 : 1920"
        :height="isMobileOrTablet ? 960 : 800"
        class="absolute inset-0 size-full object-cover"
        fit="cover"
        quality="80"
        densities="x1"
        loading="eager"
        fetchpriority="high"
        preload
      />
      <div
        aria-hidden="true"
        class="absolute inset-0 bg-black"
        :style="{ opacity: overlayOpacity ?? 0.4 }"
      />
    </template>

    <template v-else-if="decor === 'orbs'">
      <div
        aria-hidden="true"
        class="
          absolute -top-24 -left-20 size-80 rounded-full bg-primary/20
          blur-3xl
        "
      />
      <div
        aria-hidden="true"
        class="
          absolute -right-16 -bottom-28 size-72 rounded-full bg-secondary/20
          blur-3xl
        "
      />
    </template>
    <div
      v-else-if="decor === 'gradient'"
      aria-hidden="true"
      class="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent"
    />

    <UContainer
      :class="[
        'relative flex flex-col gap-5 py-16 md:py-24 lg:py-28',
        centred ? 'items-center text-center' : 'items-start text-start',
      ]"
    >
      <p
        v-if="eyebrow"
        :class="[
          'text-xs font-semibold tracking-[0.14em] uppercase',
          inverted ? 'text-white/80' : 'text-accent',
        ]"
      >
        {{ eyebrow }}
      </p>

      <h1
        v-if="label"
        :class="[
          `
            font-display max-w-3xl text-4xl font-semibold tracking-tight
            text-balance
            md:text-5xl
            lg:text-6xl
          `,
          inverted ? 'text-white' : 'text-highlighted',
        ]"
      >
        {{ label }}
      </h1>

      <p
        v-if="subheading"
        :class="[
          'max-w-2xl text-base text-pretty md:text-lg',
          inverted ? 'text-white/85' : 'text-muted',
        ]"
      >
        {{ subheading }}
      </p>

      <div
        v-if="(ctaText && ctaLink) || (secondaryCtaText && secondaryCtaLink)"
        class="mt-2 flex flex-wrap gap-3"
        :class="centred && 'justify-center'"
      >
        <UButton
          v-if="ctaText && ctaLink"
          :to="localePath(ctaLink)"
          :label="ctaText"
          color="secondary"
          size="xl"
        />
        <UButton
          v-if="secondaryCtaText && secondaryCtaLink"
          :to="localePath(secondaryCtaLink)"
          :label="secondaryCtaText"
          color="neutral"
          variant="outline"
          size="xl"
          :class="inverted && 'bg-transparent text-white ring-white/40 hover:bg-white/10'"
        />
      </div>

      <dl
        v-if="stats?.length"
        class="mt-4 flex flex-wrap gap-x-10 gap-y-4"
        :class="centred && 'justify-center'"
      >
        <div
          v-for="(stat, idx) in stats"
          :key="idx"
          class="flex flex-col"
          :class="centred && 'items-center'"
        >
          <dt
            :class="[
              'font-mono text-2xl font-semibold tabular-nums md:text-3xl',
              inverted ? 'text-white' : 'text-highlighted',
            ]"
          >
            {{ stat.value }}
          </dt>
          <dd
            :class="[
              'text-xs tracking-wide uppercase',
              inverted ? 'text-white/70' : 'text-muted',
            ]"
          >
            {{ stat.label }}
          </dd>
        </div>
      </dl>
    </UContainer>
  </section>
</template>
