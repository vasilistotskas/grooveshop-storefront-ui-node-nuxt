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
      border-b border-[#1E293B] bg-[#0F172A] px-5 py-16
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
            border-[#334155] px-3.5 py-1.5
          "
        >
          <span
            aria-hidden="true"
            class="block size-1.5 rounded-full bg-[#FBBF24]"
          />
          <span
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-[#FBBF24]
              uppercase
            "
          >{{ eyebrow }}</span>
        </p>

        <h2
          v-if="heading"
          class="
            mt-7 text-[30px] leading-[1.15] font-bold tracking-[-0.02em]
            text-white
            lg:text-[40px]
          "
        >
          {{ heading }}
        </h2>

        <p
          v-if="body"
          class="mt-7 text-[16px] leading-[1.7] text-[#94A3B8]"
        >
          {{ bodyParts.before }}<span
            v-if="bodyParts.mark"
            class="font-semibold text-white"
          >{{ bodyParts.mark }}</span>{{ bodyParts.after }}
        </p>

        <p
          v-if="note"
          class="
            mt-7 border-l-2 border-[#334155] pl-4 font-mono text-[12px]
            text-[#64748B]
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
              class="mt-0.5 size-4 shrink-0 text-[#5BC4C4]"
              aria-hidden="true"
            />
            <span
              class="text-[15px] leading-[1.55] text-[#94A3B8]"
            >{{ bullet.text }}</span>
          </li>
        </ul>

        <NuxtLinkLocale
          v-if="ctaText"
          :to="(ctaLink ?? '/contact') as RouteLocationNamedI18n"
          class="
            mt-8 flex h-[46px] w-full items-center justify-center gap-2
            rounded-md bg-[#5BC4C4] px-6 text-[14px] font-semibold
            text-[#020617] transition-colors
            hover:bg-[#8EDBDA]
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
          class="rounded-lg border border-[#1E293B] bg-[#020617] p-5"
        >
          <p
            v-if="card.label"
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-[#5BC4C4]
              uppercase
            "
          >
            {{ card.label }}
          </p>
          <p class="mt-2.5 text-[19px] leading-none font-semibold text-white">
            {{ card.name }}
          </p>
          <p
            v-if="card.subtitle"
            class="mt-2 font-mono text-[11.5px] leading-[1.4] text-[#64748B]"
          >
            {{ card.subtitle }}
          </p>
          <dl
            v-if="card.rows?.length"
            class="
              mt-4 flex flex-col gap-[11px] border-t border-[#1E293B] pt-4
            "
          >
            <div
              v-for="row in card.rows"
              :key="row.label"
              class="flex items-baseline justify-between gap-3"
            >
              <dt class="text-[12.5px] text-[#64748B]">
                {{ row.label }}
              </dt>
              <dd
                class="
                  font-mono text-[11.5px] text-right text-[#E2E8F0]
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
