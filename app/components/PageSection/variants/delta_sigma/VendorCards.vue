<script lang="ts" setup>
/**
 * "Ο εξοπλισμός που εμπιστευόμαστε" — a card per manufacturer.
 *
 * Measured off the συνεργάτες artboard at 1440px: a two-across grid of
 * `rounded-xl` bordered cards on a 24px gap, each split in two by a
 * hairline — the NAME sits on the page's own ground at 34px bold, and
 * everything that explains it sits on the raised one: a 10.5px teal
 * monospace label, a 15px/1.7 paragraph, a second hairline, then the
 * part numbers as `rounded-full` bordered monospace chips.
 *
 * The split is the whole device: it makes the name read as a heading
 * rather than a card title, which is what a page of manufacturers
 * needs — you scan the names first and read one of them.
 *
 * The note under the grid carries the platforms that do NOT get a card
 * (Siemens, WAGO, INVT, Advantech on the artboard). It is one string,
 * not a fifth card, because "we also work on these" is a sentence
 * about the four above rather than another entry beside them.
 *
 * COLOUR IS TOKENS, NOT LITERALS — `bg-default` for the band and the
 * name strip, `bg-muted` for the body, `border-default` for every
 * rule, `text-primary` for the label, `text-muted` for the prose and
 * `text-dimmed` for the chips. The artboard's `#020617` / `#0F172A` /
 * `#1E293B` / `#5BC4C4` are this tenant's resolved dark tokens, so the
 * band inverts for light mode on its own.
 */
const props = defineProps<{
  note?: string
  items?: { title: string, label?: string, text?: string, tags?: string[] }[]
}>()

const hasItems = computed(() => !!props.items?.length)
</script>

<template>
  <section
    v-if="hasItems"
    class="
      border-b border-default bg-default px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <ul
        class="
          grid gap-6
          lg:grid-cols-2
        "
      >
        <li
          v-for="item in items"
          :key="item.title"
          class="
            flex h-full flex-col overflow-hidden rounded-xl border
            border-default
          "
        >
          <h2
            class="
              px-6 py-7 text-[28px] leading-none font-bold tracking-[-0.02em]
              text-highlighted
              lg:px-8 lg:py-9 lg:text-[34px]
            "
          >
            {{ item.title }}
          </h2>
          <div
            class="
              flex flex-1 flex-col border-t border-default bg-muted px-6 py-7
              lg:px-8
            "
          >
            <p
              v-if="item.label"
              class="
                font-mono text-[10.5px] tracking-[0.16em] text-primary uppercase
              "
            >
              {{ item.label }}
            </p>
            <p
              v-if="item.text"
              class="mt-5 text-[15px] leading-[1.7] text-muted"
            >
              {{ item.text }}
            </p>
            <ul
              v-if="item.tags?.length"
              class="
                mt-auto flex flex-wrap gap-2 border-t border-default pt-6
              "
            >
              <li
                v-for="tag in item.tags"
                :key="tag"
                class="
                  rounded-full border border-default px-3 py-1 font-mono
                  text-[11px] text-dimmed
                "
              >
                {{ tag }}
              </li>
            </ul>
          </div>
        </li>
      </ul>

      <p
        v-if="note"
        class="
          mt-6 flex items-start gap-3 rounded-lg border border-default bg-muted
          px-5 py-4 text-[13px] leading-[1.6] text-muted
          lg:items-center
        "
      >
        <UIcon
          name="i-lucide:info"
          class="
            mt-0.5 size-4 shrink-0 text-dimmed
            lg:mt-0
          "
          aria-hidden="true"
        />
        {{ note }}
      </p>
    </div>
  </section>
</template>
