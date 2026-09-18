<script lang="ts" setup>
/**
 * What customers said.
 *
 * `rating` is the five-point scale a reader expects, not `ProductReview`'s
 * internal 1..10 — the merchant types what the stars should show.
 * `role` is who the quote is from ("Verified buyer", "Χονδρική"), which
 * is what gives it weight and which merchants used to smuggle into the
 * name.
 */
defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  items?: Array<{
    name: string
    text: string
    avatar?: string
    role?: string
    rating?: number
  }>
  surface?: 'default' | 'muted'
}>()
</script>

<template>
  <PageSectionBand
    v-if="items?.length"
    :heading="heading || title"
    :surface="surface"
  >
    <UPageGrid class="lg:grid-cols-3">
      <UPageCard
        v-for="(item, idx) in items"
        :key="idx"
        variant="subtle"
        :ui="{ container: 'gap-4' }"
      >
        <UInputRating
          v-if="item.rating"
          :model-value="item.rating"
          :length="5"
          size="xs"
          color="warning"
          readonly
        />
        <blockquote class="text-sm text-pretty text-default md:text-base">
          {{ item.text }}
        </blockquote>
        <template #footer>
          <UUser
            :name="item.name"
            :description="item.role"
            :avatar="item.avatar ? { src: item.avatar, alt: item.name } : { text: item.name.slice(0, 1) }"
            size="sm"
          />
        </template>
      </UPageCard>
    </UPageGrid>
  </PageSectionBand>
</template>
