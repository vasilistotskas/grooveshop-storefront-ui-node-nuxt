<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({
  title: t('seo_title'),
})

/**
 * The form owns the login. The demo strip hands it credentials rather
 * than signing in itself, so there is one path through the pending
 * two-factor flow, the cart refresh and the `next` bookkeeping.
 */
const form = useTemplateRef('form')
</script>

<template>
  <AuthPanel
    :title="t('title')"
    :lead="t('lead')"
  >
    <AccountDemoAccountCard
      :loading="form?.isSubmitting"
      @login="({ email, password }) => form?.performLogin(email, password)"
    />
    <AccountLoginForm ref="form" />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  seo_title: Σύνδεση
  title: Καλώς ήρθες ξανά
  lead: Συνδέσου για να βλέπεις τις παραγγελίες σου, να κρατάς αγαπημένα και να εξαργυρώνεις πόντους.
en:
  seo_title: Sign in
  title: Welcome back
  lead: Sign in to track orders, save favourites and spend your points.
</i18n>
