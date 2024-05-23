<script lang="ts" setup>
const { recoveryCodes } = useAllAuthAccount()

const { data, error } = await recoveryCodes()

if (error.value) {
  throw createError(error.value)
}

const unused_codes = data.value?.data.unused_codes
const created_at = data.value?.data.created_at
const last_used_at = data.value?.data.last_used_at
const type = data.value?.data.type
const total_code_count = data.value?.data.total_code_count
const unused_code_count = data.value?.data.unused_code_count

const rows = unused_codes?.map((code: string) => ({ code })) ?? []
const columns = [
  {
    key: 'code',
    label: 'Code',
  },
]

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
  <div class="container mx-auto p-4">
    <div class="rounded-lg bg-white p-6 shadow-md">
      <h2 class="mb-4 text-2xl font-semibold">
        Recovery Codes
      </h2>
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
            <strong>{{ $t('common.created_at') }}:</strong> {{ created_at }}
          </p>
          <p
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            <strong>{{ $t('common.last_used_at') }}:</strong> {{ last_used_at }}
          </p>
          <p
            class="
              text-primary-950

              dark:text-primary-50
            "
          >
            <strong>{{ $t('common.type') }}:</strong> {{ type }}
          </p>
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
        <div>
          <UButton
            :label="$t('pages.account.security.mfa.recovery.codes.download')"
            :trailing="false"
            color="primary"
            icon="i-heroicons-arrow-down-tray-20-solid"
            size="sm"
            variant="solid"
            @click="downloadCodes"
          />
        </div>
      </div>
      <section class="mt-6">
        <LazyUTable
          v-if="unused_codes"
          :columns="columns"
          :rows="rows"
        />
      </section>
    </div>
  </div>
</template>
