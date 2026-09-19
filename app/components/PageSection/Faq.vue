<script lang="ts" setup>
import type { AccordionItem } from '@nuxt/ui'

/**
 * The questions a store answers before it is asked.
 *
 * The section owns the canonical Q&A data, so it also emits the
 * `FAQPage` structured data — nothing else on the page knows the
 * answers.
 *
 * The accordion keeps a reading measure (`max-w-3xl`) but is NOT
 * centred. `PageSectionBand` left-aligns its heading, as every other
 * section does, so `mx-auto` put "Συχνές ερωτήσεις" against the
 * container edge and the questions 300px to its right — measured on the
 * demo store at 1920: heading at x=265, first question at x=569.
 */
const props = defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  subheading?: string
  items?: Array<{ question: string, answer: string }>
  multiple?: boolean
  surface?: 'default' | 'muted'
}>()

const accordionItems = computed<AccordionItem[]>(() =>
  (props.items ?? []).map(item => ({
    label: item.question,
    content: item.answer,
  })),
)

useSchemaOrg(
  computed(() =>
    (props.items ?? []).map(item =>
      defineQuestion({ name: item.question, acceptedAnswer: item.answer }),
    ),
  ),
)
</script>

<template>
  <PageSectionBand
    v-if="accordionItems.length"
    :heading="heading || title"
    :subheading="subheading"
    :surface="surface"
  >
    <UAccordion
      :items="accordionItems"
      :type="multiple ? 'multiple' : 'single'"
      :unmount-on-hide="false"
      class="w-full max-w-3xl"
      :ui="{
        item: `
          border-b border-default
          last:border-b-0
        `,
        trigger: 'py-4 text-start',
        label: 'font-medium text-pretty text-highlighted',
        body: 'pb-4 text-sm text-pretty text-muted',
      }"
    />
  </PageSectionBand>
</template>
