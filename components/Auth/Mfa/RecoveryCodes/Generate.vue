<script lang="ts" setup>
const { recoveryCodesGenerate } = useAuthMfa()
const { t } = useI18n()
const toast = useToast()

function onSubmit() {
  recoveryCodesGenerate({})
    .then(async ({ error }) => {
      if (error.value) {
        throw error.value
      }
      toast.add({
        title: t('pages.auth.security.mfa.recovery.codes.generate.success'),
        color: 'green',
      })
      await navigateTo('/auth/security/mfa/recovery-codes')
    })
    .catch(() => {
      toast.add({
        title: t('pages.auth.security.mfa.recovery.codes.generate.error'),
        color: 'red',
      })
    })
}
</script>

<template>
  <div class="container-2xs p-0 md:px-6">
    <section class="grid items-center justify-center justify-items-center">
      <UButton
        :label="
          $t('pages.auth.security.mfa.recovery.codes.generate.form.button')
        "
        size="xl"
        color="white"
        @click="onSubmit"
      />
    </section>
  </div>
</template>
