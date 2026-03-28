<script lang="ts" setup>
import pkg from '../../../package.json'

const siteConfig = useSiteConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const { columns } = useFooterLinks()

const packageVersion = pkg.version
</script>

<template>
  <UFooter
    class="
      mt-6 hidden border-t-2 border-primary-500 bg-primary-50
      md:block
      dark:bg-primary-900
    "
  >
    <template #top>
      <UContainer>
        <UFooterColumns
          :columns="columns"
          :ui="{ center: 'xl:col-span-3' }"
        />
      </UContainer>
    </template>

    <template #left>
      <span
        class="
          text-sm text-primary-950
          dark:text-primary-100
        "
      >
        &copy; {{ new Date().getFullYear() }}&nbsp;
        <UButton
          :label="`${siteConfig.name}™.`"
          :to="localePath('index')"
          class="p-0 text-primary-950 dark:text-primary-50"
          color="neutral"
          size="lg"
          type="button"
          variant="link"
        /> {{ t('all_rights_reserved') }}.
      </span>
    </template>

    <template #right>
      <div class="flex items-center gap-6">
        <Socials
          :button-size="'sm'"
          :icon-class="'text-xl'"
        />
        <span
          class="
            text-xs text-primary-950
            dark:text-primary-300
          "
        >Version: {{ packageVersion }}</span>
      </div>
    </template>
  </UFooter>
</template>

<i18n lang="yaml">
el:
  all_rights_reserved: All rights reserved
  footer:
    terms_conditions: Όροι και Προϋποθέσεις
    term_of_use: Όροι Χρήσης
    vision: Όραμα
    privacy_policy: Πολιτική Απορρήτου
    cookies_policy: Πολιτική Cookies
    help_center: Κέντρο βοηθείας
    contact:
      us: Επικοινωνία
    about:
      us: Σχετικά με εμάς
      site: Τι είναι το Webside
    microlearning:
      title: Microlearning
      why: Γιατί Microlearning
      what: Τι είναι το Microlearning
</i18n>
