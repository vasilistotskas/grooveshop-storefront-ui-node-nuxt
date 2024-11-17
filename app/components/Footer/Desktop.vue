<script lang="ts" setup>
import pkg from '../../../package.json'

const config = useRuntimeConfig()
const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local' })

const packageVersion = pkg.version
</script>

<template>
  <footer
    class="
      bg-primary-50 border-primary-500 mt-6 w-full border-t-2 pt-2

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
              text-primary-950 text-xs font-semibold uppercase

              dark:text-primary-50

              md:text-sm
            "
          >
            {{ $t('about.us') }}
          </span>
          <ul
            class="
              text-primary-950 grid gap-2 font-medium

              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$t('about.site')"
                :title="$t('about.site')"
                :to="'about'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('about.site') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$t('vision')"
                :title="$t('vision')"
                :to="'vision'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('vision') }}
              </Anchor>
            </li>
          </ul>
        </div>
        <div class="flex w-full flex-col gap-4">
          <span
            class="
              text-primary-950 text-xs font-semibold uppercase

              dark:text-primary-50

              md:text-sm
            "
          >
            {{ t('microlearning.title') }}
          </span>
          <ul
            class="
              text-primary-950 grid gap-2 font-medium

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
              text-primary-950 text-xs font-semibold uppercase

              dark:text-primary-50

              md:text-sm
            "
          >
            {{ $t('terms_conditions') }}
          </span>
          <ul
            class="
              text-primary-950 grid gap-2 font-medium

              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$t('term_of_use')"
                :title="$t('term_of_use')"
                :to="'terms-of-use'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('term_of_use') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$t('privacy_policy')"
                :title="$t('privacy_policy')"
                :to="'privacy-policy'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('privacy_policy') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$t('cookies_policy')"
                :title="$t('cookies_policy')"
                :to="'cookies-policy'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('cookies_policy') }}
              </Anchor>
            </li>
          </ul>
        </div>
        <div class="flex w-full flex-col gap-4">
          <span
            class="
              text-primary-950 text-xs font-semibold uppercase

              dark:text-primary-50

              md:text-sm
            "
          >
            {{ $t('help_center') }}
          </span>
          <ul
            class="
              text-primary-950 grid gap-2 font-medium

              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$t('contact_us')"
                :title="$t('contact_us')"
                :to="'contact'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('contact_us') }}
              </Anchor>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div
      class="
        bg-primary-100 w-full pt-4

        dark:bg-primary-900

        md:pt-0
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
              text-primary-950 row-start-2 text-sm

              dark:text-primary-300

              md:row-start-1

              sm:text-center
            "
          >© {{ new Date().getFullYear() }}&nbsp;
            <UButton
              :label="`${config.public.siteName}™.`"
              :to="localePath('index')"
              class="p-0"
              color="opposite"
              size="lg"
              type="button"
              variant="link"
            /> {{ $t('all_rights_reserved') }}.
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
                text-primary-950 text-xs

                dark:text-primary-300

                sm:text-center
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
