<script lang="ts" setup>
const { recoveryCodesList } = useAuthMfa()

const { data: recoveryCodes } = await recoveryCodesList()
const codes = recoveryCodes.value?.unusedCodes
const rows = codes?.map((code: string) => ({ code })) ?? []
const columns = [
  {
    key: 'code',
    label: 'Code',
  },
]

const downloadCodes = () => {
  if (!codes) return
  const blob = new Blob([codes.join('\n')], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'recovery-codes.txt'
  link.href = url
  link.click()
}
</script>

<template>
  <div class="container-2xs grid items-center justify-center p-0 md:px-6">
    <UButton
      size="sm"
      color="white"
      variant="solid"
      :label="$t('pages.auth.security.mfa.recovery.codes.download')"
      :trailing="false"
      icon="i-heroicons-arrow-down-tray-20-solid"
      @click="downloadCodes"
    />
    <section class="grid">
      <LazyUTable v-if="recoveryCodes" :rows="rows" :columns="columns" />
    </section>
  </div>
</template>
