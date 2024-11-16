<script lang="ts" setup>
const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local' })

const items = [{
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
}]
</script>

<template>
  <footer
    class="
      bg-primary-50

      dark:bg-primary-900

      w-full pb-[3.75rem]
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
            border-primary-200

            dark:border-primary-700

            gap-1 border-b bg-secondary-light

            dark:bg-secondary-dark
          "
          color="primary"
          variant="ghost"
        >
          <template #leading>
            <div
              class="
                -my-1 flex size-10 items-center justify-center rounded-full
              "
            >
              <UIcon
                :name="item.icon"
                class="
                  text-primary-50

                  dark:text-primary-50

                  size-6
                "
              />
            </div>
          </template>

          <span
            class="
              text-primary-50

              dark:text-primary-50

              truncate text-2xl
            "
          >{{ item.label }}</span>

          <template #trailing>
            <UIcon
              :name="open ? 'i-heroicons-chevron-up-20-solid' : 'i-heroicons-chevron-down-20-solid'"
              class="
                text-primary-50

                dark:text-primary-50

                ms-auto size-6 transition-transform duration-200
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
            :label="$t('about.site')"
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
            :label="$t('vision')"
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
            :label="$t('term_of_use')"
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
            :label="$t('privacy_policy')"
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
            :label="$t('cookies_policy')"
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
  microlearning:
    title: Microlearning
    why: Γιατί Microlearning
    what: Τι είναι το Microlearning
</i18n>
