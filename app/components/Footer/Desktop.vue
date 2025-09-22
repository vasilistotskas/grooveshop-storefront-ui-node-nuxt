<script lang="ts" setup>
import pkg from '../../../package.json'

const siteConfig = useSiteConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const { $i18n } = useNuxtApp()

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
            {{ $i18n.t('about.us') }}
          </span>
          <ul
            class="
              grid gap-2 font-medium text-primary-950
              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$i18n.t('about.site')"
                :title="$i18n.t('about.site')"
                :to="'about'"
                class="
                  flex-1 text-sm capitalize
                  hover:no-underline
                "
              >
                {{ $i18n.t('about.site') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$i18n.t('vision')"
                :title="$i18n.t('vision')"
                :to="'vision'"
                class="
                  flex-1 text-sm capitalize
                  hover:no-underline
                "
              >
                {{ $i18n.t('vision') }}
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
                  flex-1 text-sm capitalize
                  hover:no-underline
                "
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
                  flex-1 text-sm capitalize
                  hover:no-underline
                "
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
            {{ $i18n.t('terms_conditions') }}
          </span>
          <ul
            class="
              grid gap-2 font-medium text-primary-950
              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$i18n.t('term_of_use')"
                :title="$i18n.t('term_of_use')"
                :to="'terms-of-use'"
                class="
                  flex-1 text-sm capitalize
                  hover:no-underline
                "
              >
                {{ $i18n.t('term_of_use') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$i18n.t('privacy_policy')"
                :title="$i18n.t('privacy_policy')"
                :to="'privacy-policy'"
                class="
                  flex-1 text-sm capitalize
                  hover:no-underline
                "
              >
                {{ $i18n.t('privacy_policy') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$i18n.t('cookies_policy')"
                :title="$i18n.t('cookies_policy')"
                :to="'cookies-policy'"
                class="
                  flex-1 text-sm capitalize
                  hover:no-underline
                "
              >
                {{ $i18n.t('cookies_policy') }}
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
            {{ $i18n.t('help_center') }}
          </span>
          <ul
            class="
              grid gap-2 font-medium text-primary-950
              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$i18n.t('contact_us')"
                :title="$i18n.t('contact_us')"
                :to="'contact'"
                class="
                  flex-1 text-sm capitalize
                  hover:no-underline
                "
              >
                {{ $i18n.t('contact_us') }}
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
              dark:text-primary-300
            "
          >© {{ new Date().getFullYear() }}&nbsp;
            <UButton
              :label="`${siteConfig.name}™.`"
              :to="localePath('index')"
              class="p-0"
              color="secondary"
              size="lg"
              type="button"
              variant="link"
            /> {{ $i18n.t('all_rights_reserved') }}.
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
  microlearning:
    title: Microlearning
    why: Γιατί Microlearning
    what: Τι είναι το Microlearning
</i18n>
