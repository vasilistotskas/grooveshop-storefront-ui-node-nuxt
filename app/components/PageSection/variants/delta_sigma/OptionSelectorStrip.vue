<script lang="ts" setup>
/**
 * `option_selector` with `layout: "strip"` — a numbered SEQUENCE.
 *
 * "Οκτώ φάσεις, ένας υπεύθυνος": eight phases as eight underlined
 * tabs over one panel. Measured off the δραστηριότητες artboard at
 * 1440px: a row of equal tabs each opening with a 2px rule — teal on
 * the chosen one, `border-default` on the rest — then its ordinal in
 * dim monospace and a 13.5px title, the chosen tab on the raised
 * ground. The panel under it is the phase's own line on the left and
 * what it HANDS OVER on the right, one bullet per deliverable.
 *
 * The ordinal leads because the phases are an order, not a menu: the
 * tab says which step of eight this is before it says what it is
 * called. It is also why the tabs are not boxed cards (the shape the
 * same band takes for three product variants) — a boxed card reads as
 * a thing you pick between, and these are stages you pass through.
 *
 * COLOUR IS TOKENS, so the band inverts for light mode on its own.
 */
interface Option {
  name: string
  label?: string
  title?: string
  rationale?: string
  bullets?: string[]
}

const props = defineProps<{
  heading?: string
  standfirst?: string
  bulletsLabel?: string
  options?: Option[]
}>()

const { active, tabs, tabId, panelId, onKeydown } = useTabList(
  () => props.options?.length ?? 0,
)
const current = computed(() => props.options?.[active.value])
</script>

<template>
  <section
    v-if="options?.length"
    class="
      border-b border-default bg-default px-5 py-16
      lg:px-20 lg:pt-20 lg:pb-24
    "
  >
    <div class="mx-auto max-w-[1280px]">
      <div
        v-if="heading || standfirst"
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

      <!-- The strip scrolls on a phone rather than wrapping: eight
           tabs on two rows lose the sequence the ordinals carry. -->
      <div
        role="tablist"
        :aria-label="heading"
        :class="heading || standfirst ? 'mt-10' : ''"
        class="-mx-5 flex overflow-x-auto px-5 lg:mx-0 lg:px-0"
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
            min-w-[150px] shrink-0 cursor-pointer border-t-2 px-4 pt-3.5 pb-4
            text-left transition-colors
            lg:min-w-0 lg:flex-1
          "
          :class="index === active
            ? 'border-primary bg-muted'
            : 'border-default hover:border-accented hover:bg-muted/60'"
          @click="active = index"
          @keydown="onKeydown($event, index)"
        >
          <span
            v-if="option.label"
            class="block font-mono text-[11px]"
            :class="index === active ? 'text-primary' : 'text-dimmed'"
          >{{ option.label }}</span>
          <span
            class="mt-2 block text-[13.5px] leading-[1.35]"
            :class="index === active
              ? 'font-semibold text-highlighted'
              : 'text-dimmed'"
          >{{ option.name }}</span>
        </button>
      </div>

      <div
        v-if="current"
        :id="panelId"
        role="tabpanel"
        :aria-labelledby="tabId(active)"
        aria-live="polite"
        class="
          mt-6 grid gap-8 rounded-xl border border-default bg-muted p-6
          lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:gap-16 lg:p-8
        "
      >
        <div>
          <p
            v-if="current.label"
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-primary uppercase
            "
          >
            {{ current.label }}
          </p>
          <h3
            class="
              mt-4 text-[22px] leading-[1.2] font-bold tracking-[-0.02em]
              text-highlighted
              lg:text-[26px]
            "
          >
            {{ current.title ?? current.name }}
          </h3>
          <p
            v-if="current.rationale"
            class="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-muted"
          >
            {{ current.rationale }}
          </p>
        </div>

        <div v-if="current.bullets?.length">
          <p
            v-if="bulletsLabel"
            class="
              font-mono text-[10.5px] tracking-[0.14em] text-dimmed uppercase
            "
          >
            {{ bulletsLabel }}
          </p>
          <ul
            class="flex flex-col gap-3"
            :class="bulletsLabel ? 'mt-4' : ''"
          >
            <li
              v-for="bullet in current.bullets"
              :key="bullet"
              class="flex items-start gap-3"
            >
              <span
                aria-hidden="true"
                class="mt-[7px] block size-1.5 shrink-0 rounded-full bg-primary"
              />
              <span class="text-[13.5px] leading-[1.6] text-muted">
                {{ bullet }}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
