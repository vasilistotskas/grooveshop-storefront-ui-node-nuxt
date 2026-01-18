<script lang="ts" setup>
import pkg from '../../../package.json'

const siteConfig = useSiteConfig()
const localePath = useLocalePath()
const { t } = useI18n()

const packageVersion = pkg.version
</script>

<template>
  <footer
    class="
      mt-6 hidden w-full border-t-2 border-primary-500 bg-primary-50 pt-2
      md:block
      dark:bg-primary-900
    "
  >
    <div class="container mx-auto w-full">
      <div
        class="
          grid grid-cols-2 gap-4
          md:grid md:grid-cols-4 md:gap-8 md:px-6 md:py-8
        "
      >
        <div class="flex w-full flex-col gap-4">
          <span
            class="
              text-xs font-semibold text-primary-950 uppercase
              md:text-sm
              dark:text-primary-50
            "
          >
            {{ t('about.us') }}
          </span>
          <ul
            class="
              grid gap-2 font-medium text-primary-950
              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="t('about.site')"
                :title="t('about.site')"
                :to="'about'"
                class="
                  flex-1 text-sm text-primary-700 capitalize
                  hover:text-primary-900 hover:no-underline
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
                :ui="{
                  base: 'items-start p-0 text-start',
                }"
              >
                {{ t('about.site') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="t('vision')"
                :title="t('vision')"
                :to="'vision'"
                class="
                  flex-1 text-sm text-primary-700 capitalize
                  hover:text-primary-900 hover:no-underline
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
                :ui="{
                  base: 'items-start p-0 text-start',
                }"
              >
                {{ t('vision') }}
              </Anchor>
            </li>
          </ul>
        </div>
        <div class="flex w-full flex-col gap-4">
          <span
            class="
              text-xs font-semibold text-primary-950 uppercase
              md:text-sm
              dark:text-primary-50
            "
          >
            {{ t('microlearning.title') }}
          </span>
          <ul
            class="
              grid gap-2 font-medium text-primary-950
              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="t('microlearning.what')"
                :title="t('microlearning.what')"
                :to="'what-is-microlearning'"
                class="
                  flex-1 text-sm text-primary-700 capitalize
                  hover:text-primary-900 hover:no-underline
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
                :ui="{
                  base: 'items-start p-0 text-start',
                }"
              >
                {{ t('microlearning.what') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="t('microlearning.why')"
                :title="t('microlearning.why')"
                :to="'why-microlearning'"
                class="
                  flex-1 text-sm text-primary-700 capitalize
                  hover:text-primary-900 hover:no-underline
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
                :ui="{
                  base: 'items-start p-0 text-start',
                }"
              >
                {{ t('microlearning.why') }}
              </Anchor>
            </li>
          </ul>
        </div>
        <div class="flex w-full flex-col gap-4">
          <span
            class="
              text-xs font-semibold text-primary-950 uppercase
              md:text-sm
              dark:text-primary-50
            "
          >
            {{ t('terms_conditions') }}
          </span>
          <ul
            class="
              grid gap-2 font-medium text-primary-950
              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="t('term_of_use')"
                :title="t('term_of_use')"
                :to="'terms-of-use'"
                class="
                  flex-1 text-sm text-primary-700 capitalize
                  hover:text-primary-900 hover:no-underline
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
                :ui="{
                  base: 'items-start p-0 text-start',
                }"
              >
                {{ t('term_of_use') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="t('privacy_policy')"
                :title="t('privacy_policy')"
                :to="'privacy-policy'"
                class="
                  flex-1 text-sm text-primary-700 capitalize
                  hover:text-primary-900 hover:no-underline
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
                :ui="{
                  base: 'items-start p-0 text-start',
                }"
              >
                {{ t('privacy_policy') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="t('cookies_policy')"
                :title="t('cookies_policy')"
                :to="'cookies-policy'"
                class="
                  flex-1 text-sm text-primary-700 capitalize
                  hover:text-primary-900 hover:no-underline
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
                :ui="{
                  base: 'items-start p-0 text-start',
                }"
              >
                {{ t('cookies_policy') }}
              </Anchor>
            </li>
          </ul>
        </div>
        <div class="flex w-full flex-col gap-4">
          <span
            class="
              text-xs font-semibold text-primary-950 uppercase
              md:text-sm
              dark:text-primary-50
            "
          >
            {{ t('help_center') }}
          </span>
          <ul
            class="
              grid gap-2 font-medium text-primary-950
              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="t('contact.us')"
                :title="t('contact.us')"
                :to="'contact'"
                class="
                  flex-1 text-sm text-primary-700 capitalize
                  hover:text-primary-900 hover:no-underline
                  dark:text-primary-200
                  hover:dark:text-primary-50
                "
                :ui="{
                  base: 'items-start p-0 text-start',
                }"
              >
                {{ t('contact.us') }}
              </Anchor>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div
      class="
        w-full bg-primary-100 pt-4
        md:pt-0
        dark:bg-primary-900
      "
    >
      <div class="container mx-auto w-full">
        <div
          class="
            grid
            md:flex md:items-center md:justify-between md:px-4 md:py-6
          "
        >
          <span
            class="
              row-start-2 text-sm text-primary-950
              sm:text-center
              md:row-start-1
              dark:text-primary-100
            "
          >© {{ new Date().getFullYear() }}&nbsp;
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
          <div
            class="
              my-4 flex flex-col items-center justify-between gap-2
              md:my-0 md:flex-row md:gap-12
            "
          >
            <div
              class="
                flex flex-wrap
                sm:justify-center
              "
            >
              <Socials
                :button-size="'sm'"
                :icon-class="'text-xl'"
              />
            </div>
            <span
              class="
                text-xs text-primary-950
                sm:text-center
                dark:text-primary-300
              "
            >Version: {{ packageVersion }}</span>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<i18n lang="yaml">
el:
  terms_conditions: Όροι και Προϋποθέσεις
  term_of_use: Όροι Χρήσης
  vision: Όραμα
  privacy_policy: Πολιτική Απορρήτου
  cookies_policy: Πολιτική Cookies
  help_center: Κέντρο βοηθείας
  contact:
    us: Επικοινωνία
  all_rights_reserved: All rights reserved
  about:
    us: Σχετικά με εμάς,
    site: Τι είναι το Webside
  microlearning:
    title: Microlearning
    why: Γιατί Microlearning
    what: Τι είναι το Microlearning
</i18n>
