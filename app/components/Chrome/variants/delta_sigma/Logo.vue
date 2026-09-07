<script lang="ts" setup>
/**
 * The ΔΣ mark plus wordmark lockup, as drawn in the artboards.
 *
 * Two stroked paths — a Δ triangle at 65% opacity and a Σ — then the
 * wordmark with both Greek capitals in brand teal and a monospace
 * `CONSULTING · ENGINEERING` caption beneath. The caption is the detail
 * that makes the lockup read as an engineering practice rather than a
 * shop, so it is part of the logo rather than an optional extra.
 *
 * Every colour is a SEMANTIC TOKEN, so the lockup follows the colour
 * mode: the mark and the two Greek capitals take `--ui-primary` (the
 * tenant's brand teal, `#5BC4C4` in dark and the darker `#007F7F` in
 * light, where teal-on-white needs the contrast), the wordmark takes
 * `--ui-text-highlighted` and the caption `--ui-text-dimmed`. The mark
 * paints with `currentColor` and inherits `text-primary` from its own
 * wrapper, so there is one source for the brand colour rather than two.
 */
withDefaults(defineProps<{
  /** Artboard sizes: 30px in the header, 26px in the footer. */
  markSize?: number
  /** The footer lockup omits nothing; mobile hides the caption. */
  showCaption?: boolean
}>(), {
  markSize: 30,
  showCaption: true,
})
</script>

<template>
  <span class="flex items-center gap-2.5">
    <svg
      class="shrink-0 text-primary"
      :width="markSize"
      :height="Math.round(markSize * 0.9)"
      viewBox="0 0 34 30"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11 3 L20 27 L2 27 Z"
        stroke="currentColor"
        stroke-opacity="0.65"
        stroke-width="2.4"
        stroke-linejoin="round"
      />
      <path
        d="M32 3 H16 L25 15 L16 27 H32"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
    <span class="flex flex-col gap-px">
      <span
        class="
          text-base leading-[1.1] font-semibold tracking-[-0.01em] text-highlighted
        "
      ><span class="text-primary">Δ</span>elta
        <span class="text-primary">Σ</span>igma</span>
      <span
        v-if="showCaption"
        class="
          font-mono text-[8.5px] leading-none tracking-[0.14em] text-dimmed
          uppercase
        "
      >Consulting · Engineering</span>
    </span>
  </span>
</template>
