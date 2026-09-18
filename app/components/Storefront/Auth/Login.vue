<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()

const items = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('account-login'),
    label: t('breadcrumb.items.account-login.label'),
    icon: t('breadcrumb.items.account-login.icon'),
    current: true,
  },
])

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

/**
 * The form owns the login. The demo card hands it credentials rather
 * than signing in itself, so there is one path through the pending
 * two-factor flow, the cart refresh and the `next` bookkeeping.
 */
const form = useTemplateRef('form')
</script>

<template>
  <div>
    <UContainer class="pt-6">
      <UBreadcrumb :items="items" />
    </UContainer>

    <PageSectionBand surface="muted">
      <template #header>
        <PageTitle
          :text="t('title')"
          class="sr-only"
        />
      </template>

      <div class="mx-auto flex w-full max-w-md flex-col gap-6">
        <AccountDemoAccountCard
          :loading="form?.isSubmitting"
          @login="({ email, password }) => form?.performLogin(email, password)"
        />

        <UPageCard
          variant="outline" :ui="{ container: `
            p-0
            sm:p-0
          ` }"
        >
          <AccountLoginForm ref="form" />
        </UPageCard>
      </div>
    </PageSectionBand>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Σύνδεση
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
en:
  title: Sign in
  breadcrumb:
    items:
      account-login:
        label: Sign in
        icon: i-heroicons-arrow-right-on-rectangle
</i18n>
