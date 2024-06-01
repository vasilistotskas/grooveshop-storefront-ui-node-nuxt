<script lang="ts" setup>
import pkg from '~/package.json'

const config = useRuntimeConfig()

const packageVersion = pkg.version
</script>

<template>
  <footer
    class="
      bg-primary-50 mt-6 w-full border-t-2 border-primary-500 pt-2

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
              text-xs font-semibold uppercase text-primary-950

              dark:text-primary-50

              md:text-sm
            "
          >
            {{ $t('common.about.us') }}
          </span>
          <ul
            class="
              grid gap-2 text-primary-950 font-medium

              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$t('common.about.site')"
                :title="$t('common.about.site')"
                :to="'about'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('common.about.site') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$t('common.vision')"
                :title="$t('common.vision')"
                :to="'vision'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('common.vision') }}
              </Anchor>
            </li>
          </ul>
        </div>
        <div class="flex w-full flex-col gap-4">
          <span
            class="
              text-xs font-semibold uppercase text-primary-950

              dark:text-primary-50

              md:text-sm
            "
          >
            {{ $t('common.microlearning.title') }}
          </span>
          <ul
            class="
              grid gap-2 text-primary-950 font-medium

              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$t('common.microlearning.what')"
                :title="$t('common.microlearning.what')"
                :to="'what-is-microlearning'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('common.microlearning.what') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$t('common.microlearning.why')"
                :title="$t('common.microlearning.why')"
                :to="'why-microlearning'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('common.microlearning.why') }}
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
            {{ $t('common.terms_conditions') }}
          </span>
          <ul
            class="
              grid gap-2 text-primary-950 font-medium

              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$t('common.term_of_use')"
                :title="$t('common.term_of_use')"
                :to="'terms-of-use'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('common.term_of_use') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$t('common.privacy_policy')"
                :title="$t('common.privacy_policy')"
                :to="'privacy-policy'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('common.privacy_policy') }}
              </Anchor>
            </li>
            <li class="grid">
              <Anchor
                :text="$t('common.cookies_policy')"
                :title="$t('common.cookies_policy')"
                :to="'cookies-policy'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('common.cookies_policy') }}
              </Anchor>
            </li>
          </ul>
        </div>
        <div class="flex w-full flex-col gap-4">
          <span
            class="
              text-xs font-semibold uppercase text-primary-950

              dark:text-primary-50

              md:text-sm
            "
          >
            {{ $t('common.help_center') }}
          </span>
          <ul
            class="
              grid gap-2 text-primary-950 font-medium

              dark:text-primary-400
            "
          >
            <li class="grid">
              <Anchor
                :text="$t('common.contact_us')"
                :title="$t('common.contact_us')"
                :to="'contact'"
                class="
                  flex-1 text-sm capitalize

                  hover:no-underline
                "
              >
                {{ $t('common.contact_us') }}
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
              :to="config.public.siteUrl"
              class="p-0"
              color="opposite"
              size="lg"
              type="button"
              variant="link"
            /> {{ $t('common.all_rights_reserved') }}.
          </span>
          <div
            class="
              mb-4 mt-4 flex flex-col items-center justify-between gap-2

              md:mb-0 md:mt-0 md:flex-row md:gap-12
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
