<script lang="ts" setup>
const emit = defineEmits(['generateRecoveryCodes'])

const { generateRecoveryCodes } = useAllAuthAccount()
const { t } = useI18n()
const toast = useToast()

const loading = ref(false)

async function onSubmit() {
  try {
    await generateRecoveryCodes()
    toast.add({
      title: t('pages.account.security.mfa.recovery.codes.generate.success'),
      color: 'green',
    })
  }
  catch {
    toast.add({
      title: t('pages.account.security.mfa.recovery.codes.generate.error'),
      color: 'red',
    })
  }
}
</script>

<template>
  <div
    class="
      container-2xs p-0

      md:px-6
    "
  >
    <section class="grid items-center justify-center justify-items-center">
      <UButton
        :label="
          $t('pages.account.security.mfa.recovery.codes.generate.form.button')
        "
        color="primary"
        size="xl"
        @click="onSubmit"
      />
    </section>
  </div>
</template>
