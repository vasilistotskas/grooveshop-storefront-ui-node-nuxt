<script lang="ts" setup>
const { t } = useI18n()
const { isMobileOrTablet } = useDevice()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('account'),
    label: t('breadcrumb.items.account.label'),
    icon: t('breadcrumb.items.account.icon'),
  },
  {
    to: localePath('account-signup-passkey-create'),
    label: t('breadcrumb.items.account-signup-passkey-create.label'),
    icon: t('breadcrumb.items.account-signup-passkey-create.icon'),
    current: true,
  },
])

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper
    class="
      !mt-0 flex flex-col gap-0 p-0
      md:!mt-4
    "
  >
    <UBreadcrumb
      :items="items"
      :ui="{
        item: isMobileOrTablet ? `
          text-primary-950
          dark:text-primary-50
        ` : `
          text-primary-950
          dark:text-primary-50
        `,
        root: `
          text-xs
          md:text-base
        `,
      }"
      class="
        absolute z-10 mx-auto w-auto max-w-(--container-xl) bg-transparent !px-4
        !pt-2
        md:relative md:mb-5 md:w-full md:!pt-0
        dark:bg-transparent
      "
    />
    <UContainer
      class="
        mt-12 w-xl max-w-full
        sm:px-0
        md:mt-0
        lg:px-0
      "
    >
      <UPageCard variant="outline" class="w-full max-w-full">
        <div class="space-y-6">
          <div class="text-center">
            <div class="mb-4 inline-flex items-center justify-center">
              <UIcon
                name="i-heroicons-shield-check" class="size-12 text-primary"
              />
            </div>
            <h1 class="text-2xl font-bold text-highlighted">
              {{ t('title') }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              {{ t('description') }}
            </p>
          </div>

          <UAlert
            color="success"
            variant="soft"
            icon="i-heroicons-sparkles"
          >
            <template #title>
              {{ t('benefits.title') }}
            </template>
            <template #description>
              <ul class="mt-2 space-y-1 text-xs">
                <li class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-check-circle" class="size-4 shrink-0" />
                  <span>{{ t('benefits.secure') }}</span>
                </li>
                <li class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-check-circle" class="size-4 shrink-0" />
                  <span>{{ t('benefits.fast') }}</span>
                </li>
                <li class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-check-circle" class="size-4 shrink-0" />
                  <span>{{ t('benefits.no_password') }}</span>
                </li>
              </ul>
            </template>
          </UAlert>

          <AccountSignupCreatePasskeyForm />
        </div>
      </UPageCard>
    </UContainer>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Δημιουργία κωδικού μιας χρήσης
  description: Πρόκειται να δημιουργήσεις έναν κωδικό μιας χρήσης για το λογαριασμό σου. Καθώς μπορείς να προσθέσεις επιπλέον κλειδιά αργότερα, μπορείς να χρησιμοποιήσεις ένα περιγραφικό όνομα για να διακρίνεις τα κλειδιά μεταξύ τους.
  benefits:
    title: Γιατί κλειδιά πρόσβασης;
    secure: Ασφαλέστερα από κωδικούς πρόσβασης
    fast: Πιο γρήγορη σύνδεση
    no_password: Δεν χρειάζεται να θυμάσαι κωδικούς
  breadcrumb:
    items:
      account:
        label: Λογαριασμός
        icon: i-heroicons-user
      account-signup-passkey-create:
        label: Κλειδί
        icon: i-heroicons-key
</i18n>
