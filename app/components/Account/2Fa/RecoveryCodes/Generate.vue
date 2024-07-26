<script lang="ts" setup>
const emit = defineEmits(['generateRecoveryCodes'])

const { getRecoveryCodes, generateRecoveryCodes } = useAllAuthAccount()
const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()

const { data, refresh } = await getRecoveryCodes()

const hasCodes = computed(() => {
  if (!data.value?.data?.unused_code_count) {
    return false
  }
  return data.value?.data?.unused_code_count > 0
})

const loading = ref(false)

async function onSubmit() {
  try {
    loading.value = true
    await generateRecoveryCodes()
    toast.add({
      title: t('common.codes.generated'),
      color: 'green',
    })
    emit('generateRecoveryCodes')
    await navigateTo(localePath('/account/2fa/recovery-codes'))
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      const errors = 'errors' in error.data.data ? error.data.data.errors : []
      errors.forEach((error) => {
        toast.add({
          title: error.message,
          color: 'red',
        })
      })
      return
    }
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
  finally {
    loading.value = false
  }
}

onReactivated(() => {
  refresh()
})
</script>

<template>
  <div
    class="
      container-2xs p-0

      md:px-6
    "
  >
    <section class="grid items-center justify-center justify-items-center gap-4">
      <p
        class="
          text-primary-950

          dark:text-primary-50
        "
      >
        {{ $t('pages.account.2fa.recovery-codes.generate.description') }}
        {{ hasCodes ? $t('pages.account.2fa.recovery-codes.generate.invalidate') : '' }}
        {{ $t('pages.account.2fa.recovery-codes.generate.confirm') }}
      </p>

      <UButton
        :label="
          $t('common.generate')
        "
        color="primary"
        size="xl"
        @click="onSubmit"
      />
    </section>
  </div>
</template>
