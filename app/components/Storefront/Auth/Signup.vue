<script lang="ts" setup>
const { t } = useI18n()
const tenantStore = useTenantStore()
const { data: loyaltySettings } = await useLoyalty().fetchSettings()

useSeoMeta({
  title: t('seo_title'),
})

// The welcome bonus is promised only where the store gives one: loyalty
// on (plan AND setting) and the new-customer bonus on. Django awards it
// with the first order's points.
const welcomeBonus = computed(() =>
  tenantStore.loyaltyEnabled
  && !!loyaltySettings.value?.enabled
  && !!loyaltySettings.value?.newCustomerBonusEnabled,
)
</script>

<template>
  <AuthPanel
    :title="t('title')"
    :lead="welcomeBonus ? t('lead_bonus') : t('lead')"
  >
    <AccountSignupForm />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  seo_title: Εγγραφή
  title: Δημιούργησε λογαριασμό
  lead: Δωρεάν, και θέλει ένα λεπτό.
  lead_bonus: Δωρεάν, θέλει ένα λεπτό, και η πρώτη σου παραγγελία κερδίζει μπόνους καλωσορίσματος.
en:
  seo_title: Sign up
  title: Create your account
  lead: Free, and takes a minute.
  lead_bonus: Free, takes a minute, and your first order earns a welcome bonus.
</i18n>
