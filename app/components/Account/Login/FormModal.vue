<script lang="ts" setup>
/**
 * Sign in without leaving the page — the blog opens this when a guest
 * comments or likes. The same form as the sign-in page, in the board's
 * dialog frame; it closes itself once the session arrives.
 */
const { t } = useI18n()
const { loggedIn } = useUserSession()
const isOpen = defineModel<boolean>()

watch(loggedIn, () => {
  if (loggedIn.value) {
    isOpen.value = false
  }
})
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="t('title')"
    :description="t('description')"
    :ui="{
      ...DIALOG_UI,
      content: `
        ${DIALOG_UI.content}
        max-w-110
      `,
      description: 'text-sm text-muted',
    }"
  >
    <template #body>
      <AccountLoginForm />
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Σύνδεση
  description: Συνδέσου για να συνεχίσεις
en:
  title: Sign in
  description: Sign in to carry on
</i18n>
