<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * Δelta Σigma's DeSET band — the section the redesign is built around.
 *
 * Copy left on a 38% column, three comparison cards right, measured
 * off the artboard at 1440px: a `#0F172A` ground, 96px of padding, an
 * 80px gap, an amber obligation pill, a 40px/46px heading, a 16px/1.7
 * body with one phrase in the emphasis weight, a cited footnote behind
 * a 1px rule, three teal-ticked bullets on a 56px rhythm, and a 46px
 * CTA. The cards are 228px wide on a 16px gap, on the PAGE ground
 * rather than the band's so they read as objects on it.
 *
 * `emphasis` is a substring of `body`, not markup: the platform
 * renders `media_text` body as text, and an HTML prop would be an
 * injection surface for one bold phrase. Split into three text nodes
 * here, so the worst a bad value can do is not match.
 *
 * On a phone the mobile artboard collapses each card to ONE ROW —
 * the system's name and model on the left, its headline figure right
 * — because a six-row table in a 350px column is a wall. The full
 * table is the same markup, revealed from `sm` up.
 *
 * COLOUR IS TOKENS, NOT LITERALS. Every value the artboards use turned
 * out to be a step on the tenant's own ramps — `#020617` is
 * `--ui-bg` in dark, `#1E293B` is `--ui-border`, `#94A3B8` is
 * `--ui-text-muted`, and `#5BC4C4` is `--ui-primary` exactly — so this
 * band is written in `bg-default` / `bg-muted` / `border-default` /
 * `text-muted` / `text-primary` and inverts for light mode on its own.
 * The hexes below are the MEASUREMENT that established the mapping,
 * not what the markup says.
 */
const props = defineProps<{
  eyebrow?: string
  heading?: string
  body?: string
  emphasis?: string
  note?: string
  bullets?: { text: string }[]
  specs?: {
    label?: string
    name: string
    subtitle?: string
    rows?: { label: string, value: string }[]
  }[]
  ctaText?: string
  ctaLink?: string
}>()

/** `[before, emphasised, after]` — the middle empty when it misses. */
const bodyParts = computed(() => {
  const text = props.body ?? ''
  const phrase = props.emphasis
  if (!phrase) return { before: text, mark: '', after: '' }
  const at = text.indexOf(phrase)
  if (at === -1) return { before: text, mark: '', after: '' }
  return {
    before: text.slice(0, at),
    mark: phrase,
    after: text.slice(at + phrase.length),
  }
})
</script>

<template>
  <section
    class="
      border-b border-default bg-muted px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div
      class="
        mx-auto grid max-w-[1280px] items-start gap-12
        lg:grid-cols-[38%_1fr] lg:gap-20
      "
    >
      <div>
        <p
          v-if="eyebrow"
          class="
            inline-flex items-center gap-2.5 rounded-full border
            border-accented px-3.5 py-1.5
          "
        >
          <span
            aria-hidden="true"
            class="block size-1.5 rounded-full bg-warning"
          />
          <span
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-warning
              uppercase
            "
          >{{ eyebrow }}</span>
        </p>

        <h2
          v-if="heading"
          class="
            mt-7 text-[30px] leading-[1.15] font-bold tracking-[-0.02em]
            text-highlighted
            lg:text-[40px]
          "
        >
          {{ heading }}
        </h2>

        <p
          v-if="body"
          class="mt-7 text-[16px] leading-[1.7] text-muted"
        >
          {{ bodyParts.before }}<span
            v-if="bodyParts.mark"
            class="font-semibold text-highlighted"
          >{{ bodyParts.mark }}</span>{{ bodyParts.after }}
        </p>

        <p
          v-if="note"
          class="
            mt-7 border-l-2 border-accented pl-4 font-mono text-[12px]
            text-dimmed
          "
        >
          {{ note }}
        </p>

        <ul
          v-if="bullets?.length"
          class="mt-8 flex flex-col gap-4"
        >
          <li
            v-for="bullet in bullets"
            :key="bullet.text"
            class="flex gap-3"
          >
            <UIcon
              name="i-lucide:check"
              class="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span
              class="text-[15px] leading-[1.55] text-muted"
            >{{ bullet.text }}</span>
          </li>
        </ul>

        <NuxtLinkLocale
          v-if="ctaText"
          :to="(ctaLink ?? '/contact') as RouteLocationNamedI18n"
          class="
            mt-8 flex h-[46px] w-full items-center justify-center gap-2
            rounded-md bg-primary px-6 text-[14px] font-semibold
            text-inverted transition-colors
            hover:bg-primary/85
            sm:inline-flex sm:w-auto
          "
        >
          {{ ctaText }}
          <UIcon
            name="i-lucide:arrow-right"
            class="size-4"
          />
        </NuxtLinkLocale>
      </div>

      <div
        v-if="specs?.length"
        class="
          grid gap-4
          sm:grid-cols-3
        "
      >
        <div
          v-for="card in specs"
          :key="card.name"
          class="rounded-lg border border-default bg-default p-5"
        >
          <p
            v-if="card.label"
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-primary
              uppercase
            "
          >
            {{ card.label }}
          </p>
          <div class="flex items-baseline justify-between gap-3">
            <div>
              <p
                class="
                  mt-2.5 text-[19px] leading-none font-semibold text-highlighted
                "
              >
                {{ card.name }}
              </p>
              <p
                v-if="card.subtitle"
                class="
                  mt-2 font-mono text-[11.5px] leading-[1.4] text-dimmed
                "
              >
                {{ card.subtitle }}
              </p>
            </div>
            <!-- The one figure the collapsed row carries. -->
            <p
              v-if="card.rows?.length"
              class="
                shrink-0 font-mono text-[12.5px] text-default
                sm:hidden
              "
            >
              {{ card.rows[0]?.value }}
            </p>
          </div>
          <dl
            v-if="card.rows?.length"
            class="
              mt-4 hidden flex-col gap-[11px] border-t border-default pt-4
              sm:flex
            "
          >
            <div
              v-for="row in card.rows"
              :key="row.label"
              class="flex items-baseline justify-between gap-3"
            >
              <dt class="text-[12.5px] text-dimmed">
                {{ row.label }}
              </dt>
              <dd
                class="
                  font-mono text-[11.5px] text-right text-default
                "
              >
                {{ row.value }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </section>
</template>
