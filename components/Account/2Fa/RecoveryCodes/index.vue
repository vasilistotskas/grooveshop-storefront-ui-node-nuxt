<script lang="ts" setup>
const { recoveryCodes } = useAllAuthAccount()
const { t } = useI18n()

const { data, error } = await recoveryCodes()

if (error.value) {
  throw createError(error.value)
}

const unused_codes = data.value?.data.unused_codes
const created_at = data.value?.data.created_at
const last_used_at = data.value?.data.last_used_at
const total_code_count = data.value?.data.total_code_count
const unused_code_count = data.value?.data.unused_code_count

const columns = [{
  key: 'code',
  label: t('common.code'),
}, {
  key: 'created_at',
  label: t('common.created_at'),
}, {
  key: 'last_used_at',
  label: t('common.last_used_at'),
  sortable: true,
}, {
  key: 'used',
  label: t('common.used'),
}, {
  key: 'actions',
}]

const rows = computed(() => {
  return unused_codes?.map((code) => {
    return {
      code,
      created_at,
      last_used_at,
      used: !!last_used_at,
    }
  }) ?? []
})

const downloadCodes = () => {
  if (!unused_codes) return
  const blob = new Blob([unused_codes.join('\n')], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'recovery-codes.txt'
  link.href = url
  link.click()
}
</script>

<template>
  <div class="container-2xs mx-auto p-4">
    <section
      class="
        mt-6 grid gap-4

        md:gap-8
      "
    >
      <div
        class="
          grid grid-cols-1 gap-6

          md:grid-cols-2
        "
      >
        <div>
          <p
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            <strong>{{ $t('common.total_code_count') }}:</strong> {{ total_code_count }}
          </p>
          <p
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            <strong>{{ $t('common.unused_code_count') }}:</strong> {{ unused_code_count }}
          </p>
        </div>
        <div class="grid items-center justify-center justify-items-center">
          <UButton
            class="w-full"
            icon="i-heroicons-arrow-down-on-square"
            @click="downloadCodes"
          >
            {{ $t('common.download_codes') }}
          </UButton>
        </div>
      </div>

      <UTable
        :columns="columns"
        :rows="rows"
      >
        <template #used-data="{ row }">
          <UIcon
            :class="row.used ? `
              text-green-500

              dark:text-green-400
            ` : `
              text-red-500

              dark:text-red-400
            `"
            :name="row.used ? 'i-heroicons-check-20-solid' : 'i-heroicons-x-mark'"
            class="h-6 w-6"
          />
        </template>
      </UTable>
    </section>
  </div>
</template>
