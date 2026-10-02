<script lang="ts" setup>
import type { AccordionItem } from '@nuxt/ui'

/**
 * The questions a store answers before it is asked.
 *
 * The section owns the canonical Q&A data, so it also emits the
 * `FAQPage` structured data — nothing else on the page knows the
 * answers.
 *
 * Two columns on a desk, as the design sets it: the heading and where
 * to turn when the answer is not here on the left, the questions on the
 * right; one column on a phone. The heading is the band's own, so it
 * stays the page's next h2 — only its place differs from the other
 * bands'. The first answer starts open, so the band shows what it holds.
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

const { t } = useI18n()
const localePath = useLocalePath()
const chatEnabled = useSettingFlag('CHAT_WIDGET_ENABLED', { fallback: false })

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
    :surface="surface"
  >
    <template #header>
      <!-- The heading lives in the grid below, beside the questions. -->
    </template>

    <div
      class="
        grid gap-5
        lg:grid-cols-[1fr_1.4fr] lg:gap-16
      "
    >
      <div class="flex flex-col gap-3">
        <h2
          class="
            font-display text-[1.75rem]/[1.1] font-bold tracking-[-0.02em]
            text-balance text-highlighted
            lg:text-[2.5rem]/[1.1]
          "
        >
          {{ heading || title || t('heading') }}
        </h2>
        <p
          v-if="subheading"
          class="text-muted"
        >
          {{ subheading }}
        </p>
        <i18n-t
          v-else
          :keypath="chatEnabled ? 'help_chat' : 'help'"
          tag="p"
          class="text-muted"
        >
          <template #contact>
            <ULink
              :to="localePath('contact')"
              class="
                font-semibold text-highlighted underline underline-offset-4
                hover:text-toned
              "
            >
              {{ t('contact') }}
            </ULink>
          </template>
        </i18n-t>
      </div>

      <UAccordion
        :items="accordionItems"
        :type="multiple ? 'multiple' : 'single'"
        :default-value="multiple ? ['0'] : '0'"
        :unmount-on-hide="false"
        class="border-t border-default"
        :ui="{
          item: 'border-b border-default',
          trigger: 'gap-3 py-5 text-start',
          label: 'text-[1.0625rem] font-bold text-pretty text-highlighted',
          body: 'pb-5 text-pretty text-muted',
        }"
      >
        <template #trailing="{ open }">
          <UIcon
            :name="open ? 'i-heroicons-minus' : 'i-heroicons-plus'"
            class="ms-auto size-5 shrink-0 text-highlighted"
          />
        </template>
      </UAccordion>
    </div>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Συχνές ερωτήσεις
  help: 'Δεν το βρίσκεις; {contact}.'
  help_chat: 'Δεν το βρίσκεις; {contact} ή ρώτα τον βοηθό αγορών.'
  contact: Επικοινώνησε μαζί μας
en:
  heading: Frequently asked
  help: "Can't find it? {contact}."
  help_chat: "Can't find it? {contact} or ask the shopping assistant."
  contact: Contact us
</i18n>
