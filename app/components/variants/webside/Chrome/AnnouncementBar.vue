<script lang="ts" setup>
/**
 * The operator's strip above webside's header, in webside's own look:
 * a solid ink band over its light header tint (a `primary` fill read as a
 * washed-out grey on webside's zinc palette), the sentence in its bold nav
 * weight and the code as a light chip. It scrolls away with the page; the
 * sticky header stays.
 *
 * Reads the same `announcementBar` setting as the platform's strip
 * (`useAnnouncementBar`), so the wording, phone copy, link, icon, promo
 * code and dismissal behave identically. Rendered on the SERVER and the
 * same for every visitor; `UBanner` remembers a dismissal in localStorage
 * and hides the bar before paint, so it needs no per-visitor render.
 */
const { bar, text, shortText, bannerId } = useAnnouncementBar()
</script>

<template>
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
      title: 'min-w-0 truncate text-sm font-semibold',
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
      <!-- A light chip on the bar's fill: readable on either ground and
           in both colour modes. -->
      <span
        v-if="bar?.code"
        class="
          ms-2 rounded-md bg-default px-1.5 py-0.5 font-mono text-xs font-bold
          tracking-[0.04em] text-highlighted
        "
      >{{ bar.code }}</span>
    </template>
  </UBanner>
</template>
