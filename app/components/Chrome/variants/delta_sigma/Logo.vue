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
 * `currentColor` is deliberately NOT used: the mark is teal on both
 * themes in the design, and the caption's slate is a fixed value in the
 * artboards rather than a semantic token.
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
      :width="markSize"
      :height="Math.round(markSize * 0.9)"
      viewBox="0 0 34 30"
      fill="none"
      aria-hidden="true"
      class="shrink-0"
    >
      <path
        d="M11 3 L20 27 L2 27 Z"
        stroke="#5BC4C4"
        stroke-opacity="0.65"
        stroke-width="2.4"
        stroke-linejoin="round"
      />
      <path
        d="M32 3 H16 L25 15 L16 27 H32"
        stroke="#5BC4C4"
        stroke-width="2.4"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
    <span class="flex flex-col gap-px">
      <span
        class="
          text-base leading-[1.1] font-semibold tracking-[-0.01em] text-white
        "
      ><span class="text-[#5BC4C4]">Δ</span>elta
        <span class="text-[#5BC4C4]">Σ</span>igma</span>
      <span
        v-if="showCaption"
        class="
          font-mono text-[8.5px] leading-none tracking-[0.14em] text-[#64748B]
          uppercase
        "
      >Consulting · Engineering</span>
    </span>
  </span>
</template>
