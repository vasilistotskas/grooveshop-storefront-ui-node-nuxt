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
const { t, locale } = useI18n()
const localePath = useLocalePath()

const { codes, unused, total, createdAt, lastUsedAt, copyAll, copyCode, download, print } = await useRecoveryCodes({
  securityRoute: 'account-security',
  toasts: {
    copiedAll: () => ({ title: t('copied_all'), color: 'success' }),
    copiedOne: code => ({ title: t('copied_one'), description: code, color: 'success' }),
  },
  document: {
    title: () => t('print.title'),
    made: date => t('print.made', { date }),
    keepSafe: () => t('keep_safe'),
  },
})

const epoch = (seconds: number) => new Date(seconds * 1000).toISOString()
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
