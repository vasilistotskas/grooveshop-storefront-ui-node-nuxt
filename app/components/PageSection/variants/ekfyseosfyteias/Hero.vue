<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * «Εκ φύσεως Φυτειάς» hero banner: one section type, three
 * presentations, chosen from props the section already has.
 *
 * - `seal` (artwork, `theme` not `dark`): the sage band with the huge
 *   faint φ, the pill eyebrow, and the photo in a dashed ring. The page's
 *   h1.
 * - `overlap` (artwork, `theme` = `dark`): the full-bleed photograph with
 *   a paper card pulled up over its lower edge. Text never sits on the
 *   photo. It is a band in the middle of a page, so its heading is an h2:
 *   the page already has its h1.
 * - `page` (no artwork): the typographic page hero. The page's h1.
 *
 * The overlap card is pulled up by exactly its own padding, so the photo's
 * lower edge never crosses a line of its text. Axe reads the elements
 * under each line of a paragraph and cannot determine what the text is
 * painted on when one line has the photo behind it and the next does not.
 *
 * `stats` (value and label) are a dashed-ruled row of facts under the lead
 * of the seal hero only; the other two presentations have no place for them.
 *
 * The φ is the co-op's logo letter, drawn as decoration. It overhangs the
 * band on purpose, so the band clips it. It is the band's own `::before`,
 * not an element with a text node: a glyph element sits in the stacking
 * order under part of the band's text, and axe cannot tell what the text
 * is painted on once one line is over it and the next is not.
 */
// The section row hands over every prop its type admits. The ones this
// band does not read must not fall through onto it as DOM attributes.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  eyebrow?: string
  imageUrl?: string
  imageAlt?: string
  ctaText?: string
  ctaLink?: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  stats?: Array<{ value: string, label: string }>
  decor?: 'none' | 'orbs' | 'gradient'
  theme?: 'light' | 'dark' | 'auto'
}>()

const label = computed(() => props.heading || props.title)

const presentation = computed(() => {
  if (!props.imageUrl) return 'page'
  return props.theme === 'dark' ? 'overlap' : 'seal'
})

const hasContent = computed(
  () => !!props.imageUrl || !!label.value || !!props.subheading,
)

const primary = computed(() => !!(props.ctaText && props.ctaLink))
const secondary = computed(() => !!(props.secondaryCtaText && props.secondaryCtaLink))
</script>

<template>
  <section
    v-if="hasContent && presentation === 'seal'"
    class="
      hero-glyph relative isolate overflow-hidden bg-(--fy-sage)
      text-(--fy-text)
    "
  >
    <div
      class="
        mx-auto grid w-full max-w-[1280px] items-center gap-14 px-6 pt-[clamp(48px,6vw,88px)]
        pb-[clamp(64px,7vw,104px)]
        grid-cols-[repeat(auto-fit,minmax(min(500px,100%),1fr))]
      "
    >
      <div class="flex flex-col items-start gap-7">
        <p
          v-if="eyebrow"
          class="
            inline-flex items-center gap-2.5 rounded-full border-[1.5px]
            border-dashed border-(--fy-text) px-4 py-2 text-[13.5px]
            font-semibold tracking-[0.02em]
          "
        >
          <span
            aria-hidden="true"
            class="block size-[9px] rounded-full bg-(--fy-text)"
          />
          <span>{{ eyebrow }}</span>
        </p>

        <h1
          v-if="label"
          class="
            font-display text-[length:clamp(50px,6.6vw,96px)] leading-[0.98]
            font-extrabold tracking-[-0.02em] text-balance
          "
        >
          {{ label }}
        </h1>

        <p
          v-if="subheading"
          class="
            max-w-[32em] text-[length:clamp(18px,1.5vw,21px)] leading-[1.6]
            text-pretty
          "
        >
          {{ subheading }}
        </p>

        <dl
          v-if="stats?.length"
          class="
            grid w-full gap-x-6 gap-y-4 border-t-[1.5px] border-dashed
            border-(--fy-text) pt-[18px]
            grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))]
          "
        >
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="flex flex-col gap-1"
          >
            <dt class="text-[13px] font-bold tracking-[0.12em] text-(--fy-eyebrow-on-sage) uppercase">
              {{ stat.label }}
            </dt>
            <dd class="font-display text-2xl font-bold [font-variant-numeric:lining-nums]">
              {{ stat.value }}
            </dd>
          </div>
        </dl>

        <div
          v-if="primary || secondary"
          class="flex flex-wrap gap-3"
        >
          <PageSectionVariantsEkfyseosfyteiasLink
            v-if="primary"
            :to="ctaLink!"
            look="ink"
            arrow
          >
            {{ ctaText }}
          </PageSectionVariantsEkfyseosfyteiasLink>
          <PageSectionVariantsEkfyseosfyteiasLink
            v-if="secondary"
            :to="secondaryCtaLink!"
            look="outline"
          >
            {{ secondaryCtaText }}
          </PageSectionVariantsEkfyseosfyteiasLink>
        </div>
      </div>

      <div class="flex justify-center pt-2 pb-2">
        <div
          class="
            relative aspect-square w-[min(540px,100%)] rounded-full border-2
            border-dashed border-(--fy-text) p-3.5
          "
        >
          <ImgWithFallback
            :src="imageUrl"
            :alt="imageAlt || label || ''"
            :width="1080"
            :height="1080"
            sizes="xs:90vw md:540px"
            class="block size-full rounded-full object-cover"
            fit="cover"
            quality="80"
            densities="x1 x2"
            loading="eager"
            fetchpriority="high"
            preload
          />
          <template v-if="decor === 'orbs'">
            <span
              aria-hidden="true"
              class="
                absolute top-[18px] right-[34px] block size-[22px] rounded-full
                bg-(--fy-accent)
              "
            />
            <span
              aria-hidden="true"
              class="
                absolute top-[52px] right-1.5 block size-[15px] rounded-full
                bg-(--fy-accent)
              "
            />
            <span
              aria-hidden="true"
              class="
                absolute -top-1 right-[74px] block size-3 rounded-full
                bg-(--fy-accent)
              "
            />
          </template>
        </div>
      </div>
    </div>
  </section>

  <section
    v-else-if="hasContent && presentation === 'overlap'"
    class="relative bg-(--fy-ground) pb-[clamp(48px,5vw,72px)]"
  >
    <ImgWithFallback
      :src="imageUrl"
      :alt="imageAlt || label || ''"
      :width="1536"
      :height="640"
      sizes="xs:100vw"
      class="block h-[clamp(360px,42vw,600px)] w-full object-cover"
      fit="cover"
      quality="80"
      densities="x1 x2"
      loading="lazy"
    />
    <div class="mx-auto w-full max-w-[1280px] px-6">
      <div
        class="
          relative -mt-(--card-pad) flex max-w-[560px] flex-col items-start
          gap-4 rounded-[28px] bg-(--fy-ground) p-(--card-pad)
          shadow-[0_24px_60px_-30px_rgb(28_26_23/50%)]
          [--card-pad:clamp(28px,3.5vw,44px)]
        "
      >
        <p
          v-if="eyebrow"
          class="
            text-[13px] font-bold tracking-[0.16em] text-(--fy-eyebrow)
            uppercase
          "
        >
          {{ eyebrow }}
        </p>
        <h2
          v-if="label"
          class="
            font-display text-[length:clamp(32px,3.4vw,48px)] leading-[1.05]
            font-extrabold tracking-[-0.01em] text-(--fy-text)
          "
        >
          {{ label }}
        </h2>
        <p
          v-if="subheading"
          class="text-[17px] leading-[1.7] text-(--fy-text-muted)"
        >
          {{ subheading }}
        </p>
        <PageSectionVariantsEkfyseosfyteiasLink
          v-if="primary"
          :to="ctaLink!"
          arrow
        >
          {{ ctaText }}
        </PageSectionVariantsEkfyseosfyteiasLink>
      </div>
    </div>
  </section>

  <section
    v-else-if="hasContent"
    class="bg-(--fy-ground) text-(--fy-text)"
  >
    <div
      class="
        mx-auto flex w-full max-w-[1280px] flex-col items-start gap-[18px] px-6
        pt-[clamp(40px,5vw,72px)] pb-[clamp(24px,3vw,40px)]
      "
    >
      <p
        v-if="eyebrow"
        class="
          text-[13px] font-bold tracking-[0.16em] text-(--fy-eyebrow) uppercase
        "
      >
        {{ eyebrow }}
      </p>
      <h1
        v-if="label"
        class="
          max-w-[860px] font-display text-[length:clamp(40px,5vw,72px)]
          leading-none font-extrabold tracking-[-0.02em] text-balance
        "
      >
        {{ label }}
      </h1>
      <p
        v-if="subheading"
        class="
          max-w-[860px] text-[19px] leading-[1.65] text-pretty
          text-(--fy-text-muted)
        "
      >
        {{ subheading }}
      </p>
      <div
        v-if="primary || secondary"
        class="flex flex-wrap gap-3"
      >
        <PageSectionVariantsEkfyseosfyteiasLink
          v-if="primary"
          :to="ctaLink!"
          look="ink"
          arrow
        >
          {{ ctaText }}
        </PageSectionVariantsEkfyseosfyteiasLink>
        <PageSectionVariantsEkfyseosfyteiasLink
          v-if="secondary"
          :to="secondaryCtaLink!"
          look="outline"
        >
          {{ secondaryCtaText }}
        </PageSectionVariantsEkfyseosfyteiasLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* The alternative text after the slash (empty) keeps the letter out of
   the accessibility tree, like the aria-hidden span it replaces. */
.hero-glyph::before {
  content: 'φ' / '';
  position: absolute;
  bottom: -330px;
  left: -90px;
  z-index: -10;
  font-family: var(--font-display);
  font-size: 980px;
  font-weight: 900;
  line-height: 1;
  color: var(--fy-sage-glyph);
  pointer-events: none;
  user-select: none;
}
</style>
