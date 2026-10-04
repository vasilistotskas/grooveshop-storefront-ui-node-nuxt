<script lang="ts" setup>
/**
 * Change the password — or, on an account that signs in without one,
 * set it. The page names which (`hasCurrentPassword`), in its heading
 * and its browser tab alike.
 */
const { t } = useI18n()
const { hasCurrentPassword } = storeToRefs(useAuthStore())

const title = computed(() => hasCurrentPassword.value ? t('change.title') : t('set.title'))
useHead({ title })
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="title"
      :lead="hasCurrentPassword ? t('change.lead') : t('set.lead')"
    />
    <div class="rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6">
      <AccountPasswordChangeForm />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  change:
    title: Αλλαγή κωδικού πρόσβασης
    lead: Για να τον αλλάξεις, θα χρειαστείς τον τρέχοντα κωδικό σου.
  set:
    title: Ορισμός κωδικού πρόσβασης
    lead: Συνδέεσαι χωρίς κωδικό. Όρισε έναν για να συνδέεσαι και με το email σου.
en:
  change:
    title: Change password
    lead: You will need your current password to change it.
  set:
    title: Set a password
    lead: You sign in without a password. Set one to sign in with your email too.
</i18n>
