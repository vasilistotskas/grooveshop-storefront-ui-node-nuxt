<script lang="ts" setup>
import type { RouteLocationNamedI18n } from 'vue-router'

/**
 * "Τα τρία συστήματα DeSET" — pick one, see it in full.
 *
 * A row of selectable cards over a detail panel, measured off the
 * artboard at 1440px: 3px-radius cards on a 24px gap where the chosen
 * one takes a teal border and a 10%-teal ground, then a panel whose
 * header carries a teal dot, the option's full title and its ordinal
 * right, and whose body is the spec table left against the rationale
 * right, with a footnote and a full-width CTA under it.
 *
 * Real tabs, not click handlers on divs: `role="tablist"` with arrow-
 * key roving focus, `aria-selected`, and the panel wired by
 * `aria-labelledby` — so the band is operable from the keyboard and
 * announces which of the three is showing. It renders the chosen
 * option only; the others' markup is not in the DOM, which is why the
 * panel gets `aria-live="polite"`.
 *
 * COLOUR IS TOKENS, so the band inverts for light mode on its own.
 */
interface Option {
  label?: string
  name: string
  model?: string
  title?: string
  rationale?: string
  note?: string
  ctaText?: string
  ctaLink?: string
  rows?: { label: string, value: string }[]
}

const props = defineProps<{
  heading?: string
  standfirst?: string
  rowsLabel?: string
  rationaleLabel?: string
  options?: Option[]
}>()

const active = ref(0)
const current = computed(() => props.options?.[active.value])
const tabs = useTemplateRef<HTMLButtonElement[]>('tabs')

const id = useId()
const tabId = (index: number) => `${id}-tab-${index}`
const panelId = `${id}-panel`

/**
 * Arrow keys move between tabs, as a tablist is expected to: without
 * this a keyboard user can reach the first tab and no other.
 */
function onKeydown(event: KeyboardEvent, index: number) {
  const count = props.options?.length ?? 0
  if (count < 2) return
  const step = event.key === 'ArrowRight'
    ? 1
    : event.key === 'ArrowLeft' ? -1 : 0
  const jump = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null
  if (!step && jump === null) return
  event.preventDefault()
  const next = jump ?? (index + step + count) % count
  active.value = next
  tabs.value?.[next]?.focus()
}
</script>

<template>
  <section
    v-if="options?.length"
    class="
      border-b border-default bg-default px-5 py-16
      lg:px-20 lg:py-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <div
        class="
          flex flex-col gap-5
          lg:flex-row lg:items-end lg:justify-between lg:gap-16
        "
      >
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
        <p
          v-if="standfirst"
          class="
            max-w-[420px] text-[14px] leading-[1.7] text-dimmed
            lg:text-right
          "
        >
          {{ standfirst }}
        </p>
      </div>

      <div
        class="
          mt-11 grid gap-4
          sm:grid-cols-3 sm:gap-6
        "
        role="tablist"
        :aria-label="heading"
      >
        <button
          v-for="(option, index) in options"
          :id="tabId(index)"
          :key="option.name"
          ref="tabs"
          type="button"
          role="tab"
          :aria-selected="index === active"
          :aria-controls="panelId"
          :tabindex="index === active ? 0 : -1"
          class="
            rounded-xl border p-5 text-left transition-colors
          "
          :class="index === active
            ? 'border-primary bg-primary/10'
            : 'border-default bg-default hover:border-accented'"
          @click="active = index"
          @keydown="onKeydown($event, index)"
        >
          <span
            v-if="option.label"
            class="
              block font-mono text-[10.5px] tracking-[0.14em] uppercase
            "
            :class="index === active ? 'text-primary' : 'text-dimmed'"
          >{{ option.label }}</span>
          <span
            class="
              mt-2.5 block text-[19px] leading-none font-semibold
              text-highlighted
            "
          >{{ option.name }}</span>
          <span
            v-if="option.model"
            class="mt-2 block font-mono text-[11.5px] text-dimmed"
          >{{ option.model }}</span>
        </button>
      </div>

      <div
        v-if="current"
        :id="panelId"
        role="tabpanel"
        :aria-labelledby="tabId(active)"
        aria-live="polite"
        class="mt-6 overflow-hidden rounded-xl border border-default bg-default"
      >
        <div
          class="
            flex flex-wrap items-center justify-between gap-3 border-b
            border-default px-6 py-4
          "
        >
          <p class="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              class="block size-2 rounded-full bg-primary"
            />
            <span
              class="text-[17px] font-semibold text-highlighted"
            >{{ current.title ?? current.name }}</span>
          </p>
          <span
            v-if="current.label"
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-dimmed uppercase
            "
          >{{ current.label }}</span>
        </div>

        <div
          class="
            grid
            lg:grid-cols-[minmax(0,404px)_1fr]
          "
        >
          <dl
            v-if="current.rows?.length"
            class="
              border-b border-default p-6
              lg:border-r lg:border-b-0
            "
          >
            <p
              v-if="rowsLabel"
              class="
                font-mono text-[10.5px] tracking-[0.14em] text-dimmed uppercase
              "
            >
              {{ rowsLabel }}
            </p>
            <div class="mt-4 flex flex-col">
              <div
                v-for="(row, index) in current.rows"
                :key="row.label"
                class="flex items-baseline justify-between gap-4 py-2.5"
                :class="index > 0 ? 'border-t border-default' : ''"
              >
                <dt class="text-[13.5px] text-muted">
                  {{ row.label }}
                </dt>
                <dd
                  class="font-mono text-[12.5px] text-right text-default"
                >
                  {{ row.value }}
                </dd>
              </div>
            </div>
          </dl>

          <div class="flex flex-col p-6">
            <p
              v-if="rationaleLabel"
              class="
                font-mono text-[10.5px] tracking-[0.14em] text-dimmed uppercase
              "
            >
              {{ rationaleLabel }}
            </p>
            <p
              v-if="current.rationale"
              class="mt-4 text-[15px] leading-[1.7] text-muted"
            >
              {{ current.rationale }}
            </p>
            <p
              v-if="current.note"
              class="
                mt-auto border-t border-default pt-5 text-[13px]
                leading-[1.7] text-dimmed
              "
              :class="current.rationale ? 'mt-8' : 'mt-4'"
            >
              {{ current.note }}
            </p>
            <NuxtLinkLocale
              v-if="current.ctaText"
              :to="(current.ctaLink ?? '/contact') as RouteLocationNamedI18n"
              class="
                mt-6 flex h-[46px] items-center justify-center gap-2
                rounded-md bg-primary px-6 text-[14px] font-semibold
                text-inverted transition-colors
                hover:bg-primary/85
              "
            >
              {{ current.ctaText }}
            </NuxtLinkLocale>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
