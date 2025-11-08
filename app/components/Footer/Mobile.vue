<script lang="ts" setup>
import type { AccordionItem } from '#ui/types'

const localePath = useLocalePath()
const { t } = useI18n()

const items = ref<AccordionItem[]>([{
  label: t('about.us'),
  icon: 'i-heroicons-information-circle',
  slot: 'about',
}, {
  label: t('microlearning.title'),
  icon: 'i-heroicons-light-bulb',
  slot: 'micro-learning',
}, {
  label: t('terms_conditions'),
  icon: 'i-heroicons-rectangle-group',
  slot: 'terms-conditions',
}, {
  label: t('help_center'),
  icon: 'i-heroicons-chat-bubble-oval-left',
  slot: 'contact',
}])
</script>

<template>
  <footer
    class="
      w-full bg-primary-50 pb-11
      md:hidden
      dark:bg-primary-900
    "
  >
    <UAccordion
      :items="items"
      :ui="{
        trigger: 'bg-(--ui-secondary) p-3 gap-4',
        leadingIcon: 'size-8 text-white',
        label: 'truncate text-2xl font-semibold text-white',
      }"
    >
      <template #about>
        <div
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <UButton
            :label="t('about.site')"
            :to="localePath('about')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
            variant="link"
          />
        </div>
        <div
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <UButton
            :label="t('vision')"
            :to="localePath('vision')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
            variant="link"
          />
        </div>
      </template>

      <template #micro-learning>
        <div
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <UButton
            :label="t('microlearning.what')"
            :to="localePath('what-is-microlearning')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
            variant="link"
          />
        </div>
        <div
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <UButton
            :label="t('microlearning.why')"
            :to="localePath('why-microlearning')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
            variant="link"
          />
        </div>
      </template>

      <template #terms-conditions>
        <div
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <UButton
            :label="t('term_of_use')"
            :to="localePath('terms-of-use')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
            variant="link"
          />
        </div>
        <div
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <UButton
            :label="t('privacy_policy')"
            :to="localePath('privacy-policy')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
            variant="link"
          />
        </div>
        <div
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <UButton
            :label="t('cookies_policy')"
            :to="localePath('cookies-policy')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
            variant="link"
          />
        </div>
      </template>

      <template #contact>
        <div
          class="
            text-primary-950
            dark:text-primary-50
          "
        >
          <UButton
            :label="t('title')"
            :to="localePath('contact')"
            class="font-semibold"
            color="secondary"
            size="xl"
            type="button"
            variant="link"
          />
        </div>
      </template>
    </UAccordion>
  </footer>
</template>

<i18n lang="yaml">
el:
  title: Επικοινωνία
  help_center: Κέντρο βοηθείας
  terms_conditions: Όροι και Προϋποθέσεις
  term_of_use: Όροι Χρήσης
  vision: Όραμα
  privacy_policy: Πολιτική Απορρήτου
  cookies_policy: Πολιτική Cookies
  about:
    us: Σχετικά με εμάς
    site: Τι είναι το Webside
  microlearning:
    title: Microlearning
    why: Γιατί Microlearning
    what: Τι είναι το Microlearning
</i18n>
