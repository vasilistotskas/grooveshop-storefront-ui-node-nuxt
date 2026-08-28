<script lang="ts" setup>
import type { AccordionItem } from '@nuxt/ui'

const props = defineProps<{
  title?: string
  heading?: string
  items?: Array<{ question: string, answer: string }>
  multiple?: boolean
}>()

const accordionItems = computed<AccordionItem[]>(() =>
  (props.items ?? []).map(item => ({
    label: item.question,
    content: item.answer,
    icon: 'i-heroicons-question-mark-circle',
  })),
)

// FAQPage rich result — the section owns the canonical Q&A data, so it
// also owns the structured data.
useSchemaOrg(
  computed(() =>
    (props.items ?? []).map(item =>
      defineQuestion({ name: item.question, acceptedAnswer: item.answer }),
    ),
  ),
)
</script>

<template>
  <div
    v-if="accordionItems.length"
    class="mx-auto max-w-(--container-main) md:!p-0"
  >
    <h2
      v-if="heading"
      class="
        font-display mb-6 text-2xl font-bold text-balance
        md:text-3xl
      "
    >
      {{ heading }}
    </h2>
    <UAccordion
      :items="accordionItems"
      :type="multiple ? 'multiple' : 'single'"
      :unmount-on-hide="false"
      class="
        mx-auto w-full max-w-3xl rounded-lg border border-primary-200 bg-white
        px-4
        dark:border-primary-800 dark:bg-primary-900
      "
      :ui="{
        label: 'font-semibold',
        body: `
          text-primary-700
          dark:text-primary-300
        `,
      }"
    />
  </div>
</template>
