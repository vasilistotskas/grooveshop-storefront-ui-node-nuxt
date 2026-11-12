<script lang="ts" setup>
/**
 * The operator's strip above the header — "Free shipping over 39€",
 * "Orders placed today ship tomorrow".
 *
 * Rendered on the SERVER and identically for every visitor, which is
 * what keeps it compatible with the cached anonymous render: dismissal
 * is per-visitor, and `UBanner` handles it without a per-visitor render
 * by writing the id to localStorage and hiding the bar through a class
 * on `<html>` before paint. Nothing here reads a cookie or the session.
 *
 * Fails silent: no bar, or a disabled one, renders nothing. A bar is
 * chrome, not content.
 */
const { bar, text, shortText, bannerId } = useAnnouncementBar()
</script>

<template>
  <!-- Ink by default — the design's bar. An operator who picks a
       colour in the setting still gets it. -->
  <UBanner
    v-if="bar"
    :id="bannerId"
    :icon="bar.icon"
    :title="text"
    :to="bar.link"
    :color="bar.color ?? 'neutral'"
    :close="bar.dismissible !== false"
    :ui="{
      root: 'z-40',
      container: 'h-9.5 justify-center',
      center: 'justify-center',
      icon: 'size-4',
      // A 44px target on a phone (WCAG 2.5.5): 44px wide, and its hit area
      // reaching 6px above and below the 32px button, so the bar keeps its
      // height. Nothing hangs out sideways (`overhang-is-clipped.spec.ts`).
      close: `
        relative min-w-11 justify-center
        after:absolute after:inset-x-0 after:-inset-y-1.5
        sm:min-w-0
      `,
      title: 'min-w-0 truncate text-[0.8125rem] font-semibold',
    }"
  >
    <!-- `title` stays the plain sentence: it is the link's accessible
         name, which a pair of width-toggled spans would double. -->
    <template #title>
      <span :class="shortText && 'max-sm:hidden'">{{ text }}</span>
      <span
        v-if="shortText"
        class="sm:hidden"
      >{{ shortText }}</span>
      <!-- A fill, not coloured text: volt text on a light bar fails
           contrast, and the chip reads the same on either ground. -->
      <span
        v-if="bar?.code"
        class="
          ms-2 rounded-md bg-volt px-1.5 py-0.5 font-mono text-xs font-bold
          tracking-[0.04em] text-on-volt
        "
      >{{ bar.code }}</span>
    </template>
  </UBanner>
</template>
