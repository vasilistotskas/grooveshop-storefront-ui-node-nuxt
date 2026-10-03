<script lang="ts" setup>
const { t } = useI18n()

useSeoMeta({
  title: t('title'),
})
</script>

<template>
  <AuthPanel
    :title="t('title')"
    :lead="t('lead')"
  >
    <div class="flex items-center gap-3 rounded-[1.125rem] border border-default bg-default p-4">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-elevated">
        <UIcon
          name="i-lucide-shield-check"
          class="size-5 text-highlighted"
        />
      </span>
      <p class="text-sm text-muted">
        {{ t('works_everywhere') }}
      </p>
    </div>
    <AccountSignupPasskeyForm />
  </AuthPanel>
</template>

<i18n lang="yaml">
el:
  title: Εγγραφή με passkey
  lead: Χωρίς κωδικό να θυμάσαι. Το κινητό ή ο υπολογιστής σου ξεκλειδώνει τον λογαριασμό με το πρόσωπο, το δακτυλικό αποτύπωμα ή το PIN σου.
  works_everywhere: Λειτουργεί σε iPhone, Android, Mac και Windows. Μπορείς να προσθέσεις κωδικό αργότερα.
en:
  title: Sign up with a passkey
  lead: No password to remember. Your phone or laptop unlocks your account with your face, fingerprint or PIN.
  works_everywhere: Works on iPhone, Android, Mac and Windows. You can add a password later.
</i18n>
