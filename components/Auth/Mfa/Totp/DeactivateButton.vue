<script lang="ts" setup>
const { totpDeactivate } = useAuthMfa()
const { fetch } = useUserSession()
const { t } = useI18n()
const toast = useToast()

function onSubmit() {
  totpDeactivate({})
    .then(async () => {
      toast.add({
        title: t('pages.auth.security.mfa.totp.deactivate.success'),
        color: 'green',
      })
      await fetch()
      await navigateTo('/account')
    })
    .catch(() => {
      toast.add({
        title: t('pages.auth.security.mfa.totp.deactivate.error'),
        color: 'red',
      })
    })
}
</script>

<template>
  <section class="grid items-center">
    <UButton variant="link" color="red" size="xl" @click="onSubmit">
      {{ $t('pages.auth.security.mfa.totp.deactivate.button') }}
    </UButton>
  </section>
</template>
