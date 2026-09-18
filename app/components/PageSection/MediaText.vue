<script lang="ts" setup>
/**
 * A picture on one side, the argument on the other.
 *
 * `emphasis` is a SUBSTRING of `body` set in the emphasis weight rather
 * than an HTML prop: the body renders as text, so one bold phrase can
 * never become an injection surface.
 *
 * `bullets` and `specs` fill the side that carries no image — a
 * checklist, or the comparison cards a technical page argues with.
 */
const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  eyebrow?: string
  heading?: string
  body?: string
  /** The phrase inside `body` to set in the emphasis weight. */
  emphasis?: string
  /** A footnote under the body. */
  note?: string
  bullets?: Array<{ text: string }>
  specs?: Array<{
    label?: string
    name: string
    subtitle?: string
    rows?: Array<{ label: string, value: string }>
  }>
  imageUrl?: string
  imagePosition?: 'left' | 'right'
  ctaText?: string
  ctaLink?: string
  decor?: 'none' | 'orbs' | 'gradient'
  surface?: 'default' | 'muted'
}>()

const localePath = useLocalePath()

const imageFirst = computed(() => props.imagePosition !== 'right')

/**
 * The body split around `emphasis`, so the phrase can be wrapped in a
 * real element instead of interpolated HTML. Only the first occurrence
 * is marked: a merchant naming a phrase means the one they wrote.
 */
const bodyParts = computed(() => {
  const body = props.body ?? ''
  const phrase = props.emphasis
  if (!phrase) return [{ text: body, strong: false }]

  const at = body.indexOf(phrase)
  if (at === -1) return [{ text: body, strong: false }]

  return [
    { text: body.slice(0, at), strong: false },
    { text: phrase, strong: true },
    { text: body.slice(at + phrase.length), strong: false },
  ].filter(part => part.text.length > 0)
})
</script>

<template>
  <PageSectionBand
    v-if="heading || body || imageUrl"
    :surface="surface"
  >
    <div
      class="
        relative grid items-center gap-8
        md:grid-cols-2
        md:gap-12
      "
    >
      <div
        v-if="decor === 'orbs'"
        aria-hidden="true"
        class="
          absolute -top-20 -right-20 -z-10 size-64 rounded-full bg-secondary/15
          blur-3xl
        "
      />
      <div
        v-else-if="decor === 'gradient'"
        aria-hidden="true"
        class="
          absolute inset-0 -z-10 rounded-xl
          bg-gradient-to-b from-primary/10 to-transparent
        "
      />

      <ImgWithFallback
        v-if="imageUrl"
        :src="imageUrl"
        :alt="heading || title || ''"
        :width="720"
        :height="540"
        class="
          h-64 w-full rounded-xl bg-elevated object-cover
          md:h-96
        "
        :class="imageFirst ? '' : 'md:order-2'"
        fit="cover"
        quality="80"
        loading="lazy"
      />

      <div
        class="flex flex-col gap-4"
        :class="imageFirst ? '' : 'md:order-1'"
      >
        <p
          v-if="eyebrow"
          class="text-xs font-medium tracking-wide text-muted uppercase"
        >
          {{ eyebrow }}
        </p>

        <h2
          v-if="heading"
          class="
            font-display text-2xl font-semibold tracking-tight text-highlighted
            text-balance
            md:text-3xl
          "
        >
          {{ heading }}
        </h2>

        <p
          v-if="body"
          class="whitespace-pre-line text-pretty text-muted"
        >
          <template
            v-for="(part, idx) in bodyParts"
            :key="idx"
          >
            <strong
              v-if="part.strong"
              class="font-semibold text-highlighted"
            >{{ part.text }}</strong>
            <template v-else>
              {{ part.text }}
            </template>
          </template>
        </p>

        <ul
          v-if="bullets?.length"
          class="flex flex-col gap-2"
        >
          <li
            v-for="(bullet, idx) in bullets"
            :key="idx"
            class="flex items-start gap-2 text-sm text-default"
          >
            <UIcon
              name="i-heroicons-check-circle"
              class="mt-0.5 size-5 shrink-0 text-secondary"
            />
            <span>{{ bullet.text }}</span>
          </li>
        </ul>

        <div
          v-if="specs?.length"
          class="
            grid gap-4
            sm:grid-cols-2
          "
        >
          <UCard
            v-for="(spec, idx) in specs"
            :key="idx"
            variant="subtle"
            :ui="{ body: 'flex flex-col gap-2' }"
          >
            <UBadge
              v-if="spec.label"
              :label="spec.label"
              color="secondary"
              variant="subtle"
              size="sm"
              class="self-start"
            />
            <p class="font-display font-semibold text-highlighted">
              {{ spec.name }}
            </p>
            <p
              v-if="spec.subtitle"
              class="text-sm text-muted"
            >
              {{ spec.subtitle }}
            </p>
            <dl
              v-if="spec.rows?.length"
              class="flex flex-col gap-1 text-sm"
            >
              <div
                v-for="(row, rowIdx) in spec.rows"
                :key="rowIdx"
                class="flex justify-between gap-3 border-t border-default pt-1"
              >
                <dt class="text-muted">
                  {{ row.label }}
                </dt>
                <dd class="font-mono tabular-nums text-highlighted">
                  {{ row.value }}
                </dd>
              </div>
            </dl>
          </UCard>
        </div>

        <p
          v-if="note"
          class="text-xs text-dimmed"
        >
          {{ note }}
        </p>

        <UButton
          v-if="ctaText && ctaLink"
          :to="localePath(ctaLink)"
          :label="ctaText"
          color="secondary"
          size="lg"
          class="mt-1 self-start"
        />
      </div>
    </div>
  </PageSectionBand>
</template>
