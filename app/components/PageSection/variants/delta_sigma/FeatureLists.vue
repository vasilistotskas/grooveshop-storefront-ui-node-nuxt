<script lang="ts" setup>
/**
 * "Τι κάνει ένα σύστημα DeSET" — what a thing is and what it does, as
 * two checklists, with one shared footnote beneath them.
 *
 * Measured off the artboard at 1440px: a `#0F172A` band on 96px of
 * padding, a 36px heading, then two `#020617` cards on a 24px gap,
 * each 32px-padded with a teal icon, a 17px title and 14px/1.7 items
 * behind teal ticks — then a full-width note card in 14px/1.75 muted
 * with one phrase in the emphasis weight.
 *
 * `emphasis` is a SUBSTRING of `note`, split into three text nodes —
 * the same device `media_text` uses, and for the same reason: the
 * copy is text, and an HTML prop would be an injection surface for
 * one bold phrase.
 *
 * COLOUR IS TOKENS — `bg-muted` / `bg-default` / `border-default` /
 * `text-muted` / `text-primary` — so the band inverts for light mode
 * on its own.
 */
const props = defineProps<{
  heading?: string
  items?: { title: string, icon?: string, bullets?: string[] }[]
  note?: string
  emphasis?: string
}>()

/** `[before, emphasised, after]` — the middle empty when it misses. */
const noteParts = computed(() => {
  const text = props.note ?? ''
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
    v-if="items?.length"
    class="
      border-b border-default bg-muted px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <h2
        v-if="heading"
        class="
          text-[26px] leading-[1.15] font-bold tracking-[-0.02em]
          text-highlighted
          lg:text-[36px]
        "
      >
        {{ heading }}
      </h2>

      <div
        class="
          mt-11 grid gap-6
          lg:grid-cols-2
        "
      >
        <div
          v-for="item in items"
          :key="item.title"
          class="rounded-xl border border-default bg-default p-6 lg:p-8"
        >
          <p class="flex items-center gap-3">
            <UIcon
              v-if="item.icon"
              :name="item.icon"
              class="size-4.5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span
              class="text-[17px] font-semibold text-highlighted"
            >{{ item.title }}</span>
          </p>
          <ul
            v-if="item.bullets?.length"
            class="mt-6 flex flex-col gap-4"
          >
            <li
              v-for="bullet in item.bullets"
              :key="bullet"
              class="flex gap-3"
            >
              <UIcon
                name="i-lucide:check"
                class="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span
                class="text-[14px] leading-[1.7] text-muted"
              >{{ bullet }}</span>
            </li>
          </ul>
        </div>
      </div>

      <p
        v-if="note"
        class="
          mt-6 rounded-xl border border-default bg-default p-6 text-[14px]
          leading-[1.75] text-muted
          lg:p-8
        "
      >
        {{ noteParts.before }}<span
          v-if="noteParts.mark"
          class="font-semibold text-highlighted"
        >{{ noteParts.mark }}</span>{{ noteParts.after }}
      </p>
    </div>
  </section>
</template>
