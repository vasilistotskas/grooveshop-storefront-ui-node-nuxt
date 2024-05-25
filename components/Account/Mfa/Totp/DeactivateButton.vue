<script lang="ts" setup>
const { totpDeactivate } = useAuthMfa()
const { fetch } = useUserSession()
const { t } = useI18n()
const toast = useToast()

function onSubmit() {
  totpDeactivate({})
    .then(async () => {
      toast.add({
        title: t('pages.account.security.mfa.totp.deactivate.success'),
        color: 'green',
      })
      await navigateTo('/account')
    })
    .catch(() => {
      toast.add({
        title: t('pages.account.security.mfa.totp.deactivate.error'),
        color: 'red',
      })
    })
}
</script>

<template>
  <section class="grid items-center">
    <UButton
      :label="$t('pages.account.security.mfa.totp.deactivate.button')"
      color="red"
      size="xl"
      variant="link"
      @click="onSubmit"
    />
  </section>
</template>
