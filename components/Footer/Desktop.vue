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
          flex gap-4

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
                :to="'about'"
                :title="$t('common.about.site')"
                :text="$t('common.about.site')"
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
                :to="'vision'"
                :title="$t('common.vision')"
                :text="$t('common.vision')"
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
                :to="'what-is-microlearning'"
                :title="$t('common.microlearning.what')"
                :text="$t('common.microlearning.what')"
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
                :to="'why-microlearning'"
                :title="$t('common.microlearning.why')"
                :text="$t('common.microlearning.why')"
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
                :to="'terms-of-use'"
                :title="$t('common.term_of_use')"
                :text="$t('common.term_of_use')"
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
                :to="'privacy-policy'"
                :title="$t('common.privacy_policy')"
                :text="$t('common.privacy_policy')"
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
                :to="'cookies-policy'"
                :title="$t('common.cookies_policy')"
                :text="$t('common.cookies_policy')"
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
                :to="'contact'"
                :title="$t('common.contact_us')"
                :text="$t('common.contact_us')"
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
        bg-primary-100 w-full

        dark:bg-primary-900
      "
    >
      <div class="container mx-auto w-full">
        <div
          class="
            px-2 py-3

            md:flex md:items-center md:justify-between md:px-4 md:py-6
          "
        >
          <span
            class="
              text-primary-950 text-sm

              dark:text-primary-300

              sm:text-center
            "
          >© {{ new Date().getFullYear() }}&nbsp;
            <UButton
              class="p-0"
              size="lg"
              type="button"
              color="opposite"
              variant="link"
              :label="`${config.public.siteName}™.`"
              :to="config.public.siteUrl"
            /> {{ $t('common.all_rights_reserved') }}.
          </span>
          <div
            class="
              mt-4 flex items-center justify-between gap-12

              md:mt-0
            "
          >
            <div
              class="
                flex

                sm:justify-center
              "
            >
              <Socials
                :icon-class="'text-xl'"
                :button-size="'sm'"
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
