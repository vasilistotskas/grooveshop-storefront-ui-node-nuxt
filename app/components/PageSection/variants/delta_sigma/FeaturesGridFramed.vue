<script lang="ts" setup>
/**
 * A features grid drawn as ONE frame — `decor: "framed"`.
 *
 * The parts of a single promise ("Τι συνοδεύει κάθε προμήθεια": the
 * pre-sales advice, the parameter file, the programming, the repairs),
 * so the artboard gives them one bordered box divided by vertical
 * rules rather than four cards with gaps: four cards would read as
 * four things you pick between.
 *
 * Measured off the συνεργάτες artboard at 1440px: a raised band with
 * 96px of padding, a 30px heading, a 15px standfirst under it, then a
 * `rounded-xl` frame on the page's own ground whose cells are 32px of
 * padding, a 15px title and a 13px/1.6 body.
 *
 * The rules are the grid's own `gap-px` over the border token, which
 * is the one construction that stays right at every column count: a
 * per-cell `border-l` has to know which cell starts a row, and gets
 * it wrong the moment the grid goes from four columns to two.
 * `bg-(--ui-border)` because no utility exposes the border token as a
 * background — it is still the token, not a literal.
 *
 * No ordinals and no icon tiles, which is what separates this from the
 * sibling grid: this band's cells are not a numbered sequence and each
 * is one line of copy, not a field of expertise.
 */
defineProps<{
  heading?: string
  body?: string
  items?: { title: string, text?: string }[]
}>()
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
          text-[24px] leading-[1.15] font-bold tracking-[-0.02em]
          text-highlighted
          lg:text-[30px]
        "
      >
        {{ heading }}
      </h2>
      <p
        v-if="body"
        class="mt-4 max-w-[640px] text-[15px] leading-[1.7] text-muted"
      >
        {{ body }}
      </p>

      <ul
        class="
          mt-10 grid gap-px overflow-hidden rounded-xl border border-default
          bg-(--ui-border)
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <li
          v-for="item in items"
          :key="item.title"
          class="
            bg-default p-6
            lg:p-8
          "
        >
          <h3 class="text-[15px] leading-[1.35] font-semibold text-highlighted">
            {{ item.title }}
          </h3>
          <p
            v-if="item.text"
            class="mt-3 text-[13px] leading-[1.6] text-dimmed"
          >
            {{ item.text }}
          </p>
        </li>
      </ul>
    </div>
  </section>
</template>
