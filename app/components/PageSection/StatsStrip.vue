<script lang="ts" setup>
/**
 * The proof row — "2.500+ παραγγελίες", "4.8/5".
 *
 * `hero_banner` carries the same `stats` shape inline; this is the band
 * for a page whose hero is a photo or a carousel and has nowhere to put
 * them.
 */
const props = defineProps<{
  items?: Array<{ value: string, label: string }>
  surface?: 'default' | 'muted'
}>()

const entries = computed(() => props.items ?? [])
</script>

<template>
  <PageSectionBand
    v-if="entries.length"
    :surface="surface ?? 'muted'"
    padding="sm"
  >
    <dl
      :class="[
        'grid gap-6 text-center',
        entries.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3',
      ]"
    >
      <!-- The label is the term and the figure its description, in that
           DOM order — a `<dl>` group holds only `dt`/`dd`, and the old
           visible label was a `<p>` beside a hidden copy of itself
           (Lighthouse `definition-list`). `flex-col-reverse` keeps the
           figure on top on screen. -->
      <div
        v-for="entry in entries"
        :key="entry.label"
        class="flex flex-col-reverse gap-1"
      >
        <dt class="text-sm text-muted">
          {{ entry.label }}
        </dt>
        <dd
          class="
            font-display text-3xl font-semibold tabular-nums
            text-highlighted
            md:text-4xl
          "
        >
          {{ entry.value }}
        </dd>
      </div>
    </dl>
  </PageSectionBand>
</template>
