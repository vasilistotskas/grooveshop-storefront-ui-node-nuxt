<script lang="ts" setup>
import '~/assets/css/tenants/ekfyseosfyteias.css'

/**
 * A photograph with its caption on one side, the argument on the other.
 *
 * `body` is plain text: blank lines split paragraphs and `emphasis` (the
 * first occurrence of that phrase) is set in bold as an element, never as
 * interpolated HTML. `bullets` are rows between dashed rules; a bullet
 * written `Label: value` prints its label in bold, which is how the
 * funding page lists its facts. `specs` and `decor` are not read.
 *
 * The photograph has no alt prop of its own, so `note` is both: it is the
 * image's alt text, and its visible caption is hidden from assistive
 * technology so it is not read twice. No note, no alt (decorative).
 */
// The section row hands over every prop its type admits. The ones this
// band does not read must not fall through onto it as DOM attributes.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  eyebrow?: string
  heading?: string
  body?: string
  emphasis?: string
  /** The photograph's caption. */
  note?: string
  bullets?: Array<{ text: string }>
  imageUrl?: string
  imagePosition?: 'left' | 'right'
  ctaText?: string
  ctaLink?: string
  surface?: 'default' | 'muted'
}>()

const label = computed(() => props.heading || props.title)

const imageFirst = computed(() => props.imagePosition !== 'right')

/**
 * The body as paragraphs, each split around `emphasis` so the phrase
 * becomes a real element. Only its first occurrence is marked: a
 * merchant naming a phrase means the one they wrote.
 */
const paragraphs = computed(() => {
  const phrase = props.emphasis
  let marked = false

  return (props.body ?? '')
    .split(/\r?\n\s*\r?\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => {
      const at = !marked && phrase ? paragraph.indexOf(phrase) : -1
      if (at === -1) return [{ text: paragraph, strong: false }]
      marked = true
      return [
        { text: paragraph.slice(0, at), strong: false },
        { text: phrase!, strong: true },
        { text: paragraph.slice(at + phrase!.length), strong: false },
      ].filter(part => part.text.length > 0)
    })
})

/** `Label: value` → both halves; a bullet without the separator is all value. */
const rows = computed(() => (props.bullets ?? []).map(({ text }) => {
  const at = text.indexOf(': ')
  return at === -1
    ? { label: '', value: text }
    : { label: text.slice(0, at), value: text.slice(at + 2) }
}))
</script>

<template>
  <section
    v-if="label || body || imageUrl"
    :class="surface === 'muted' ? 'bg-(--fy-raised)' : 'bg-(--fy-ground)'"
  >
    <div
      class="
        mx-auto grid w-full max-w-[1280px] items-center gap-x-[72px] gap-y-12
        px-6 py-[clamp(64px,8vw,112px)]
      "
      :class="imageUrl
        ? 'grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))]'
        : 'grid-cols-1'"
    >
      <figure
        v-if="imageUrl"
        class="flex flex-col gap-3"
        :class="!imageFirst && 'lg:order-2'"
      >
        <ImgWithFallback
          :src="imageUrl"
          :alt="note ?? ''"
          :width="960"
          :height="720"
          sizes="xs:100vw lg:50vw"
          class="block aspect-4/3 w-full rounded-[28px] object-cover"
          fit="cover"
          quality="80"
          densities="x1 x2"
          loading="lazy"
        />
        <figcaption
          v-if="note"
          aria-hidden="true"
          class="text-sm text-(--fy-text-muted)"
        >
          {{ note }}
        </figcaption>
      </figure>

      <div
        class="flex flex-col items-start gap-5"
        :class="!imageFirst && 'lg:order-1'"
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
            font-display text-[length:clamp(38px,4.2vw,62px)] leading-[1.02]
            font-extrabold tracking-[-0.015em] text-balance text-(--fy-text)
          "
        >
          {{ label }}
        </h2>

        <p
          v-for="(parts, index) in paragraphs"
          :key="index"
          class="text-[18px] leading-[1.7] text-pretty text-(--fy-text-muted)"
        >
          <template
            v-for="(part, partIndex) in parts"
            :key="partIndex"
          >
            <strong
              v-if="part.strong"
              class="font-bold text-(--fy-text)"
            >{{ part.text }}</strong>
            <template v-else>
              {{ part.text }}
            </template>
          </template>
        </p>

        <ul
          v-if="rows.length"
          class="
            w-full border-b-[1.5px] border-dashed border-(--fy-rule)
          "
        >
          <li
            v-for="(row, index) in rows"
            :key="index"
            class="
              grid gap-x-6 gap-y-1 border-t-[1.5px] border-dashed
              border-(--fy-rule) py-4 text-[16.5px] leading-[1.55]
              text-(--fy-text)
              sm:grid-cols-[minmax(150px,1fr)_2fr]
            "
          >
            <template v-if="row.label">
              <strong class="text-sm font-bold text-(--fy-eyebrow)">{{ row.label }}</strong>
              <span>{{ row.value }}</span>
            </template>
            <span
              v-else
              class="sm:col-span-2"
            >{{ row.value }}</span>
          </li>
        </ul>

        <p
          v-if="note && !imageUrl"
          class="text-sm text-(--fy-text-muted)"
        >
          {{ note }}
        </p>

        <PageSectionVariantsEkfyseosfyteiasLink
          v-if="ctaText && ctaLink"
          :to="ctaLink"
          look="ink"
          arrow
        >
          {{ ctaText }}
        </PageSectionVariantsEkfyseosfyteiasLink>
      </div>
    </div>
  </section>
</template>
