<script lang="ts" setup>
const localePath = useLocalePath()
const { t } = useI18n()

const items = [{
  label: t('common.about.us'),
  icon: 'i-heroicons-information-circle',
  slot: 'about',
}, {
  label: t('common.microlearning.title'),
  icon: 'i-heroicons-light-bulb',
  slot: 'micro-learning',
}, {
  label: t('common.terms_conditions'),
  icon: 'i-heroicons-rectangle-group',
  slot: 'terms-conditions',
}, {
  label: t('common.help_center'),
  icon: 'i-heroicons-chat-bubble-oval-left',
  slot: 'contact',
}]
</script>

<template>
  <footer
    class="
      bg-primary-50 w-full pb-[3.75rem]

      dark:bg-primary-900
    "
  >
    <UAccordion
      :items="items"
      :ui="{ wrapper: 'flex flex-col w-full' }"
    >
      <template #default="{ item, open }">
        <UButton
          :ui="{ rounded: 'rounded-none', padding: { sm: 'p-3' } }"
          class="
            gap-1 border-b border-primary-200 bg-secondary-light

            dark:border-primary-700 dark:bg-secondary-dark
          "
          color="primary"
          variant="ghost"
        >
          <template #leading>
            <div
              class="
                -my-1 flex h-10 w-10 items-center justify-center rounded-full
              "
            >
              <UIcon
                :name="item.icon"
                class="
                  h-6 w-6 text-primary-50

                  dark:text-primary-50
                "
              />
            </div>
          </template>

          <span
            class="
              truncate text-primary-50 text-2xl

              dark:text-primary-50
            "
          >{{ item.label }}</span>

          <template #trailing>
            <UIcon
              :name="open ? 'i-heroicons-chevron-up-20-solid' : 'i-heroicons-chevron-down-20-solid'"
              class="
                ms-auto h-6 w-6 transform transition-transform duration-200
                text-primary-50

                dark:text-primary-50
              "
            />
          </template>
        </UButton>
      </template>

      <template #about>
        <div
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          <UButton
            :label="$t('common.about.site')"
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
            :label="$t('common.vision')"
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
            :label="$t('common.microlearning.what')"
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
            :label="$t('common.microlearning.why')"
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
            :label="$t('common.term_of_use')"
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
            :label="$t('common.privacy_policy')"
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
            :label="$t('common.cookies_policy')"
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
            :label="$t('pages.contact.title')"
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
