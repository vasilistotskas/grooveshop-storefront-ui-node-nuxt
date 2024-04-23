<script lang="ts" setup>
const localePath = useLocalePath()
const { t } = useI18n()

const items = [{
  label: t('common.contact'),
  icon: 'i-heroicons-chat-bubble-oval-left',
  slot: 'contact',
}, {
  label: t('common.microlearning'),
  icon: 'i-heroicons-light-bulb',
  slot: 'micro-learning',
}, {
  label: t('common.about'),
  icon: 'i-heroicons-information-circle',
  slot: 'about',
}, {
  label: t('common.terms_and_policies'),
  icon: 'i-heroicons-rectangle-group',
  slot: 'terms-and-policies',
}]
</script>

<template>
  <footer
    class="
      bg-primary-50 w-full pb-[3.75rem]

      dark:bg-primary-900
    "
  >
    <UAccordion :items="items" :ui="{ wrapper: 'flex flex-col w-full' }">
      <template #default="{ item, open }">
        <UButton
          color="primary"
          variant="ghost"
          class="
            gap-1 border-b border-primary-200 bg-secondary-light

            dark:border-primary-700 dark:bg-secondary-dark
          "
          :ui="{ rounded: 'rounded-none', padding: { sm: 'p-3' } }"
        >
          <template #leading>
            <div
              class="
                -my-1 flex h-10 w-10 items-center justify-center rounded-full
              "
            >
              <UIcon
                :name="item.icon" class="
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

      <template #contact>
        <div
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          <UButton
            size="xl"
            class="font-semibold"
            type="button"
            color="secondary"
            variant="link"
            :label="$t('pages.contact.title')"
            :to="localePath('contact')"
          />
        </div>
        <div
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          <UButton
            size="xl"
            class="font-semibold"
            type="button"
            color="secondary"
            variant="link"
            :label="$t('pages.feedback.title')"
            :to="localePath('feedback')"
          />
        </div>
      </template>

      <template #about>
        <div
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          <UButton
            size="xl"
            class="font-semibold"
            type="button"
            color="secondary"
            variant="link"
            :label="$t('pages.about.title')"
            :to="localePath('about')"
          />
        </div>
      </template>

      <template #terms-and-policies>
        <div
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          <UButton
            size="xl"
            class="font-semibold"
            type="button"
            color="secondary"
            variant="link"
            :label="$t('pages.terms.title')"
            :to="localePath('terms')"
          />
        </div>
        <div
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          <UButton
            size="xl"
            class="font-semibold"
            type="button"
            color="secondary"
            variant="link"
            :label="$t('pages.privacy-policy.title')"
            :to="localePath('privacy-policy')"
          />
        </div>
        <div
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          <UButton
            size="xl"
            class="font-semibold"
            type="button"
            color="secondary"
            variant="link"
            :label="$t('pages.cookies.title')"
            :to="localePath('cookies')"
          />
        </div>
      </template>
    </UAccordion>
  </footer>
</template>
