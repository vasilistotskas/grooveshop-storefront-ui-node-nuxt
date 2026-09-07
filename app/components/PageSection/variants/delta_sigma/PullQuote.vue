<script lang="ts" setup>
/**
 * Δelta Σigma's principle band — the one centred moment on the page.
 *
 * Measured off the artboard at 1440px: a `#0F172A` ground with 96px
 * of padding, a dim `#334155` quote glyph, a 30px white quote on a
 * 640px measure, and its reason under it in 14px/1.8 at `#475569`.
 * Everything centred, which nothing else on the page is — that is the
 * band's whole job.
 */
defineProps<{
  quote?: string
  text?: string
  attribution?: string
}>()
</script>

<template>
  <section
    v-if="quote"
    class="
      border-b border-[#1E293B] bg-[#0F172A] px-5 py-16
      lg:py-24
    "
  >
    <figure class="mx-auto max-w-[640px] text-center">
      <UIcon
        name="i-lucide:quote"
        class="mx-auto size-6 text-[#334155]"
        aria-hidden="true"
      />
      <blockquote
        class="
          mt-6 text-[24px] leading-[1.3] font-semibold tracking-[-0.01em]
          text-white
          lg:text-[30px]
        "
      >
        {{ quote }}
      </blockquote>
      <figcaption
        v-if="text || attribution"
        class="mt-7 text-[14px] leading-[1.8] text-[#475569]"
      >
        <span v-if="text">{{ text }}</span>
        <cite
          v-if="attribution"
          class="mt-3 block text-[#64748B] not-italic"
        >{{ attribution }}</cite>
      </figcaption>
    </figure>
  </section>
</template>
