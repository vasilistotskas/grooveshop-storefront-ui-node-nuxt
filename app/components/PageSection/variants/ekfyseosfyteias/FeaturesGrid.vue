<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * Cards that wear the co-op's seal, in two readings chosen by `decor`:
 *
 * - `framed`: PRODUCT LABEL CARDS on the paper ground. The seal carries
 *   the first letter of the item's title, the way a jar's label does.
 * - anything else: NUMBERED VALUE CARDS on a sage band. The seal carries
 *   the item's number as a Greek numeral (α΄ β΄ γ΄ …), in order.
 *
 * `prompt` is the last cell on an ink ground: the one answer to "and if
 * I want to order?", a title, a line and one button. `columns` and
 * `icon` are not read: the grid fills its row by itself and a seal
 * replaces an icon.
 *
 * A band that links to the full list (`ctaText` + `ctaLink`) is a
 * TEASER: on a phone its cards run in a row the thumb swipes instead of
 * a column of eight, and from md they are the grid. A band without the
 * link IS the list (the cellar's categories) and stays a grid.
 */
// The section row hands over every prop its type admits. The ones this
// band does not read must not fall through onto it as DOM attributes.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  body?: string
  items?: Array<{ title: string, text?: string, icon?: string }>
  decor?: 'none' | 'gradient_tiles' | 'framed'
  ctaText?: string
  ctaLink?: string
  prompt?: { title: string, text?: string, ctaText?: string, ctaLink?: string }
}>()

const { t } = useI18n()

const framed = computed(() => props.decor === 'framed')
const teaser = computed(() => Boolean(props.ctaText && props.ctaLink))
const label = computed(() => props.heading || props.title)

// Whole class strings, so Tailwind sees every one at build time.
const listClass = computed(() => {
  if (teaser.value) {
    return framed.value
      ? 'flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(270px,100%),1fr))]'
      : 'flex md:grid md:grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]'
  }
  return framed.value
    ? 'grid grid-cols-[repeat(auto-fit,minmax(min(270px,100%),1fr))]'
    : 'grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]'
})

/** A teaser's card is a fixed width in the swiped row, a grid cell from md. */
const itemClass = computed(() => teaser.value
  ? 'w-[min(280px,78vw)] shrink-0 snap-start md:w-auto'
  : '')

/** The first letter of a title, upper-cased the Greek way (no accent). */
const monogram = (title: string) =>
  Array.from(title.trim())[0]?.toLocaleUpperCase('el') ?? ''

/** α΄ … ιβ΄ for the twelve items the section admits; the digit past that. */
const numeral = (index: number) => index < 12 ? t(`numerals.${index + 1}`) : String(index + 1)
</script>

<template>
  <section
    v-if="items?.length"
    :class="framed ? 'bg-(--fy-ground)' : 'bg-(--fy-sage)'"
    :data-fy-surface="framed ? 'ground' : undefined"
  >
    <div
      class="mx-auto flex w-full max-w-[1280px] flex-col px-6"
      :class="framed
        ? 'gap-8 py-[clamp(36px,4.5vw,64px)]'
        : 'gap-10 py-[clamp(64px,8vw,112px)]'"
    >
      <PageSectionVariantsEkfyseosfyteiasSectionHeader
        :heading="label"
        :lead="body"
        :cta-text="ctaText"
        :cta-link="ctaLink"
        :tone="framed ? 'paper' : 'sage'"
      />

      <!-- A teaser's row scrolls under the thumb, to the viewport's edges
           (it takes the container's gutter back as its padding). Its cards
           hold nothing focusable, so the row itself takes the keyboard:
           a named, focusable region, as WCAG's scrollable-region rule
           asks. From md it is the grid and does not scroll. -->
      <div
        :role="teaser ? 'region' : undefined"
        :aria-label="teaser ? label : undefined"
        :tabindex="teaser ? 0 : undefined"
        :class="teaser && `
          -mx-6 snap-x snap-mandatory scroll-px-6 overflow-x-auto px-6
          [scrollbar-width:none]
          focus-visible:outline-2 focus-visible:-outline-offset-2
          focus-visible:outline-(--fy-text)
          md:mx-0 md:overflow-visible md:px-0
        `"
      >
        <component
          :is="framed ? 'ul' : 'ol'"
          class="gap-5"
          :class="listClass"
        >
          <li
            v-for="(item, index) in items"
            :key="index"
            class="flex flex-col gap-3.5 rounded-3xl"
            :class="[
              itemClass,
              framed ? 'bg-(--fy-raised) p-7' : 'bg-(--fy-ground) p-[30px]',
            ]"
          >
            <div
              aria-hidden="true"
              class="
                flex items-center justify-center rounded-full bg-(--fy-sage)
              "
              :class="framed ? 'size-[84px]' : 'size-[76px]'"
            >
              <span
                class="
                  flex items-center justify-center rounded-full border-[1.5px]
                  border-dashed border-(--fy-text) font-display font-bold italic
                  text-(--fy-text)
                "
                :class="framed
                  ? 'size-[70px] text-[34px]'
                  : 'size-[62px] text-[26px]'"
              >{{ framed ? monogram(item.title) : numeral(index) }}</span>
            </div>
            <h3
              class="
                font-display text-[26px] leading-[1.1] font-bold text-(--fy-text)
              "
            >
              {{ item.title }}
            </h3>
            <p
              v-if="item.text"
              class="
                text-[15.5px] leading-[1.6] whitespace-pre-line
                text-(--fy-text-muted)
              "
            >
              {{ item.text }}
            </p>
          </li>

          <li
            v-if="prompt"
            class="
              flex flex-col gap-3.5 rounded-3xl bg-(--fy-ink-band) p-7
              text-(--fy-on-ink)
            "
            :class="itemClass"
          >
            <h3 class="font-display text-[30px] leading-[1.1] font-bold">
              {{ prompt.title }}
            </h3>
            <p
              v-if="prompt.text"
              class="text-[15.5px] leading-[1.6] text-(--fy-on-ink-muted)"
            >
              {{ prompt.text }}
            </p>
            <div
              v-if="prompt.ctaText && prompt.ctaLink"
              class="mt-auto flex"
            >
              <PageSectionVariantsEkfyseosfyteiasLink
                :to="prompt.ctaLink"
                look="apricot"
                class="w-full justify-center"
              >
                {{ prompt.ctaText }}
              </PageSectionVariantsEkfyseosfyteiasLink>
            </div>
          </li>
        </component>
      </div>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  numerals:
    '1': α΄
    '2': β΄
    '3': γ΄
    '4': δ΄
    '5': ε΄
    '6': στ΄
    '7': ζ΄
    '8': η΄
    '9': θ΄
    '10': ι΄
    '11': ια΄
    '12': ιβ΄
en:
  numerals:
    '1': '1'
    '2': '2'
    '3': '3'
    '4': '4'
    '5': '5'
    '6': '6'
    '7': '7'
    '8': '8'
    '9': '9'
    '10': '10'
    '11': '11'
    '12': '12'
</i18n>
