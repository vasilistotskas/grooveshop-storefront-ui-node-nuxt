<script lang="ts" setup>
const { getRecoveryCodes } = useAllAuthAccount()
const toast = useToast()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const { copy } = useClipboard()

const { data, refresh, error } = await useAsyncData(
  'recoveryCodes',
  () => getRecoveryCodes(),
)

if (error.value) {
  toast.add({
    title: t('auth.mfa.required'),
    color: 'error',
  })
  navigateTo(localePath('account-settings'))
}

const unused_codes = computed(() => data.value?.data.unused_codes ?? [])
const created_at = computed(() => data.value?.data.created_at ?? null)
const last_used_at = computed(() => data.value?.data.last_used_at ?? null)
const total_code_count = computed(() => data.value?.data.total_code_count ?? 0)
const unused_code_count = computed(() => data.value?.data.unused_code_count ?? 0)

const usedCount = computed(() => total_code_count.value - unused_code_count.value)
const usagePercentage = computed(() => ((unused_code_count.value / total_code_count.value) * 100) || 0)

const statusColor = computed(() => {
  if (unused_code_count.value <= 2) return 'error'
  if (unused_code_count.value <= 5) return 'warning'
  return 'success'
})

const createdDate = computed(() => {
  if (!created_at.value) return ''
  return new Date(created_at.value * 1000).toLocaleDateString(locale.value)
})

const lastUsedDate = computed(() => {
  if (!last_used_at.value) return null
  return new Date(last_used_at.value * 1000).toLocaleString(locale.value)
})

async function copyAllCodes() {
  const allCodes = unused_codes.value.join('\n')
  await copy(allCodes)
  toast.add({
    title: t('toast.copy_all.title'),
    description: t('toast.copy_all.description'),
    color: 'success',
    icon: 'i-heroicons-clipboard-document-check',
  })
}

async function copyCode(code: string) {
  await copy(code)
  toast.add({
    title: t('toast.copy_single.title'),
    description: code,
    color: 'success',
    icon: 'i-heroicons-clipboard-document-check',
  })
}

function downloadCodes() {
  if (!unused_codes.value) return
  const allCodes = unused_codes.value.join('\n')
  const blob = new Blob([`${t('print.title')} - ${t('print.generated')}: ${createdDate.value}\n\n${allCodes}\n\n${t('print.keep_safe')}`], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recovery-codes-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)

  toast.add({
    title: t('toast.download.title'),
    color: 'success',
    icon: 'i-heroicons-arrow-down-tray',
  })
}

function printCodes() {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    const doc = printWindow.document
    doc.write(`
      <html>
        <head>
          <title>${t('print.title')}</title>
          <style>
            body { font-family: monospace; padding: 40px; }
            h1 { font-size: 24px; margin-bottom: 20px; }
            .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 20px; }
            .code { padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
            .warning { margin-top: 30px; padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1></h1>
          <p></p>
          <div class="codes"></div>
          <div class="warning">
            <strong></strong> <span></span>
          </div>
        </body>
      </html>
    `)
    doc.close()

    // Use textContent to safely insert user-facing strings (no HTML injection)
    doc.querySelector('h1')!.textContent = t('print.title')
    doc.querySelector('p')!.textContent = `${t('print.generated')}: ${createdDate.value}`

    const codesContainer = doc.querySelector('.codes')!
    for (const code of unused_codes.value) {
      const div = doc.createElement('div')
      div.className = 'code'
      div.textContent = code
      codesContainer.appendChild(div)
    }

    doc.querySelector('.warning strong')!.textContent = t('print.important')
    doc.querySelector('.warning span')!.textContent = t('print.keep_safe')

    printWindow.print()
  }
}

onReactivated(async () => {
  await refresh()
})
</script>

<template>
  <div
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />

    <div class="w-full space-y-6">
      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div
                class="
                  flex size-10 min-w-10 items-center justify-center rounded-full
                  bg-primary/10
                "
              >
                <UIcon
                  name="i-heroicons-shield-check" class="size-5 text-primary"
                />
              </div>
              <div>
                <h1
                  class="
                    text-lg font-semibold text-gray-900
                    md:text-xl
                    dark:text-white
                  "
                >
                  {{ t('title') }}
                </h1>
                <p
                  class="
                    mt-1 text-sm text-gray-500
                    dark:text-gray-200
                  "
                >
                  {{ t('subtitle') }}
                </p>
              </div>
            </div>

            <UBadge
              :color="statusColor"
              variant="soft"
              size="lg"
              class="shrink-0"
            >
              {{ unused_code_count }}/{{ total_code_count }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-6">
          <div>
            <div class="mb-2 flex items-center justify-between text-sm">
              <span
                class="
                  font-medium text-gray-700
                  dark:text-gray-300
                "
              >
                {{ t('progress.label') }}
              </span>
              <span
                class="
                  text-gray-500
                  dark:text-gray-200
                "
              >
                {{ t('progress.remaining', unused_code_count) }}
              </span>
            </div>
            <UProgress
              :model-value="usagePercentage"
              :color="statusColor"
              size="lg"
            />
            <p
              v-if="usedCount > 0"
              class="
                mt-2 text-xs text-gray-500
                dark:text-gray-200
              "
            >
              {{ t('progress.used', usedCount) }}
            </p>
          </div>

          <div
            class="
              grid gap-4
              sm:grid-cols-2
            "
          >
            <div
              class="
                rounded-lg border border-gray-200 bg-gray-50 p-4
                dark:border-gray-700 dark:bg-gray-800/50
              "
            >
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="size-4 text-gray-400" />
                <span
                  class="
                    text-xs font-medium tracking-wide text-gray-500 uppercase
                    dark:text-gray-200
                  "
                >
                  {{ t('stats.created') }}
                </span>
              </div>
              <p
                class="
                  mt-2 text-lg font-semibold text-gray-900
                  dark:text-white
                "
              >
                {{ createdDate || t('unused') }}
              </p>
            </div>

            <div
              class="
                rounded-lg border border-gray-200 bg-gray-50 p-4
                dark:border-gray-700 dark:bg-gray-800/50
              "
            >
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-clock" class="size-4 text-gray-400" />
                <span
                  class="
                    text-xs font-medium tracking-wide text-gray-500 uppercase
                    dark:text-gray-200
                  "
                >
                  {{ t('stats.last_used') }}
                </span>
              </div>
              <p
                class="mt-2 text-lg font-semibold"
                :class="lastUsedDate ? 'text-warning' : 'text-success'"
              >
                {{ lastUsedDate || t('unused') }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-clipboard"
              @click="copyAllCodes"
            >
              {{ t('actions.copy_all') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-arrow-down-tray"
              @click="downloadCodes"
            >
              {{ t('actions.download') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-printer"
              @click="printCodes"
            >
              {{ t('actions.print') }}
            </UButton>
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="t('warning.title')"
            :description="t('warning.description')"
          />

          <div>
            <h3
              class="
                mb-3 text-sm font-medium text-gray-900
                dark:text-white
              "
            >
              {{ t('codes.title') }}
            </h3>

            <div
              class="
                grid gap-3
                sm:grid-cols-2
              "
            >
              <button
                v-for="(code, index) in unused_codes"
                :key="code"
                class="
                  group relative flex cursor-pointer items-center
                  justify-between rounded-lg border border-gray-200 bg-gray-50
                  px-4 py-3 font-mono text-lg transition-all
                  hover:border-primary hover:bg-primary/5
                  focus:ring-2 focus:ring-primary focus:outline-none
                  dark:border-gray-700 dark:bg-gray-800/50
                  dark:hover:border-primary dark:hover:bg-primary/10
                "
                @click="copyCode(code)"
              >
                <span class="flex items-center gap-3">
                  <span class="text-xs text-gray-400">{{ index + 1 }}</span>
                  <span
                    class="
                      font-semibold text-gray-900
                      dark:text-white
                    "
                  >{{ code }}</span>
                </span>
                <UIcon
                  name="i-heroicons-clipboard"
                  class="
                    size-4 text-gray-400 opacity-0 transition-opacity
                    group-hover:opacity-100
                  "
                />
              </button>
            </div>
          </div>
        </div>

        <template #footer>
          <div
            class="
              flex flex-col gap-3
              sm:flex-row sm:items-center sm:justify-between
            "
          >
            <div
              class="
                text-xs text-gray-500
                dark:text-gray-200
              "
            >
              {{ t('footer.reminder') }}
            </div>
            <UButton
              :to="localePath('account-2fa-recovery-codes-generate')"
              color="neutral"
              variant="outline"
              trailing-icon="i-heroicons-arrow-path"
            >
              {{ t('footer.regenerate') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Κωδικοί Ανάκτησης
  subtitle: Χρησιμοποίησε αυτούς τους κωδικούς σαν backup
  progress:
    label: Διαθέσιμοι Κωδικοί
    remaining: Δεν υπάρχει διαθέσιμος κωδικός | {n} διαθέσιμος κωδικός | {n} διαθέσιμοι κωδικοί
    used: Δεν έχει χρησιμοποιηθεί κωδικός | Έχει χρησιμοποιηθεί {n} κωδικός | Έχουν χρησιμοποιηθεί {n} κωδικοί
  stats:
    created: Δημιουργήθηκε
    last_used: Τελευταία Χρήση
  actions:
    copy_all: Αντιγραφή Όλων
    download: Λήψη
    print: Εκτύπωση
  warning:
    title: Σημαντική Υπενθύμιση
    description: Κάθε κωδικός μπορεί να χρησιμοποιηθεί μόνο μία φορά. Φύλαξε τους σε ασφαλές μέρος.
  codes:
    title: Οι Κωδικοί σου
  footer:
    reminder: Μην μοιραστείς αυτούς τους κωδικούς με κανέναν
    regenerate: Δημιουργία Νέων
  print:
    title: Κωδικοί Ανάκτησης
    generated: Δημιουργήθηκαν
    important: "⚠️ Σημαντικό:"
    keep_safe: Αποθήκευσε αυτούς τους κωδικούς σε ασφαλές μέρος. Κάθε κωδικός μπορεί να χρησιμοποιηθεί μόνο μία φορά.
  toast:
    copy_all:
      title: Όλοι οι κωδικοί αντιγράφηκαν
      description: Αποθήκευσε τους σε ασφαλές μέρος
    copy_single:
      title: Ο κωδικός αντιγράφηκε
    download:
      title: Οι κωδικοί έχουν ληφθεί
</i18n>
