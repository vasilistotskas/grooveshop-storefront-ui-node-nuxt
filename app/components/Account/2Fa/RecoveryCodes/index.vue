<script lang="ts" setup>
/**
 * The shopper's unused recovery codes: how many are left of the set and
 * when it was made, a warning when they run low, each code copied with
 * a click, and the whole set copied, downloaded or printed — or replaced
 * with a new one.
 *
 * The print window is written with `textContent`, never as HTML, so a
 * code cannot inject markup there. A shopper without two-step
 * verification has no codes (allauth answers 404) and goes back to the
 * Security page, where it is set up.
 */
const { getRecoveryCodes } = useAllAuthAccount()
const toast = useToast()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const { copy } = useClipboard()

const { data, error } = await useAsyncData('recoveryCodes', () => getRecoveryCodes())

if (error.value) {
  toast.add({ title: t('auth.mfa.required'), color: 'error' })
  await navigateTo(localePath('account-security'))
}

const codes = computed(() => data.value?.data.unused_codes ?? [])
const unused = computed(() => data.value?.data.unused_code_count ?? 0)
const total = computed(() => data.value?.data.total_code_count ?? 0)
const createdAt = computed(() => data.value?.data.created_at)
const lastUsedAt = computed(() => data.value?.data.last_used_at)

const epoch = (seconds: number) => new Date(seconds * 1000).toISOString()

/** The date the set was made, as the downloaded and printed copies state it. */
const madeOn = computed(() => createdAt.value ? new Date(createdAt.value * 1000).toLocaleDateString(locale.value) : '')

async function copyAll() {
  await copy(codes.value.join('\n'))
  toast.add({ title: t('copied_all'), color: 'success' })
}

async function copyCode(code: string) {
  await copy(code)
  toast.add({ title: t('copied_one'), description: code, color: 'success' })
}

function download() {
  const text = `${t('print.title')} — ${t('print.made', { date: madeOn.value })}\n\n${codes.value.join('\n')}\n\n${t('keep_safe')}`
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `recovery-codes-${Date.now()}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

function print() {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  const doc = printWindow.document
  doc.write(`<html><head><title></title><style>
    body { font-family: monospace; padding: 40px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 24px 0; }
    .code { padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 16px; }
  </style></head><body><h1></h1><p class="made"></p><div class="codes"></div><p class="keep"></p></body></html>`)
  doc.close()
  doc.title = t('print.title')
  doc.querySelector('h1')!.textContent = t('print.title')
  doc.querySelector('.made')!.textContent = t('print.made', { date: madeOn.value })
  const list = doc.querySelector('.codes')!
  for (const code of codes.value) {
    const item = doc.createElement('div')
    item.className = 'code'
    item.textContent = code
    list.appendChild(item)
  }
  doc.querySelector('.keep')!.textContent = t('keep_safe')
  printWindow.print()
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <p class="text-sm text-toned">
      <i18n-t keypath="summary">
        <template #unused>
          <span class="font-semibold text-highlighted">{{ t('unused', { unused, total }) }}</span>
        </template>
        <template #made>
          <NuxtTime
            v-if="createdAt"
            :datetime="epoch(createdAt)"
            :locale="locale"
            day="numeric"
            month="short"
            year="numeric"
          />
        </template>
      </i18n-t>
      ·
      <template v-if="lastUsedAt">
        <i18n-t keypath="last_used">
          <template #when>
            <NuxtTime
              :datetime="epoch(lastUsedAt)"
              :locale="locale"
              relative
              numeric="auto"
            />
          </template>
        </i18n-t>
      </template>
      <template v-else>
        {{ t('never_used') }}
      </template>
    </p>

    <UAlert
      v-if="recoveryCodesRunningLow(unused)"
      :title="t('low.title', unused)"
      :description="t('low.description')"
      icon="i-lucide-triangle-alert"
      color="warning"
      variant="soft"
    />

    <ol class="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <li
        v-for="(code, index) in codes"
        :key="code"
      >
        <button
          :aria-label="t('copy_code', { code })"
          type="button"
          class="
            flex w-full cursor-pointer items-center gap-2 rounded-[0.75rem] bg-elevated px-3 py-2.5
            font-mono text-sm text-highlighted transition-colors
            hover:bg-accented
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
          "
          @click="() => copyCode(code)"
        >
          <span class="text-xs text-toned">{{ index + 1 }}</span>
          <span>{{ code }}</span>
        </button>
      </li>
    </ol>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        :label="t('actions.copy_all')"
        icon="i-lucide-copy"
        color="neutral"
        variant="outline"
        size="sm"
        @click="copyAll"
      />
      <UButton
        :label="t('actions.download')"
        icon="i-lucide-download"
        color="neutral"
        variant="outline"
        size="sm"
        @click="download"
      />
      <UButton
        :label="t('actions.print')"
        icon="i-lucide-printer"
        color="neutral"
        variant="outline"
        size="sm"
        @click="print"
      />
      <UButton
        :label="t('actions.generate')"
        :to="localePath('account-2fa-recovery-codes-generate')"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        size="sm"
      />
    </div>

    <p class="text-xs text-toned">
      {{ t('keep_safe') }}
    </p>
  </div>
</template>

<i18n lang="yaml">
el:
  summary: "{unused} · δημιουργήθηκαν {made}"
  unused: "{unused} από {total} αχρησιμοποίητοι"
  last_used: Τελευταία χρήση {when}
  never_used: Δεν έχει χρησιμοποιηθεί κανένας
  low:
    title: "Δεν απομένει κανένας κωδικός | Απομένει μόνο {n} κωδικός | Απομένουν μόνο {n} κωδικοί"
    description: Δημιούργησε νέους πριν τελειώσουν, για να μη χάσεις την πρόσβαση στον λογαριασμό σου.
  copy_code: Αντιγραφή του κωδικού {code}
  copied_all: Οι κωδικοί αντιγράφηκαν
  copied_one: Ο κωδικός αντιγράφηκε
  actions:
    copy_all: Αντιγραφή όλων
    download: Λήψη
    print: Εκτύπωση
    generate: Νέοι κωδικοί
  keep_safe: Φύλαξέ τους κάπου ασφαλές και μην τους μοιραστείς. Ο καθένας ισχύει μία φορά.
  print:
    title: Κωδικοί ανάκτησης
    made: Δημιουργήθηκαν {date}
en:
  summary: "{unused} · made {made}"
  unused: "{unused} of {total} unused"
  last_used: Last used {when}
  never_used: None used yet
  low:
    title: "No codes left | Only {n} code left | Only {n} codes left"
    description: Make new ones before they run out, so you never lose access to your account.
  copy_code: Copy the code {code}
  copied_all: Codes copied
  copied_one: Code copied
  actions:
    copy_all: Copy all
    download: Download
    print: Print
    generate: New codes
  keep_safe: Keep them somewhere safe and never share them. Each one works once.
  print:
    title: Recovery codes
    made: Made {date}
</i18n>
