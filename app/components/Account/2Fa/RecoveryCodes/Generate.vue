<script lang="ts" setup>
/**
 * Replace the recovery codes with a new set. While codes are left,
 * generating cancels every one of them, so the shopper confirms that
 * first; with none left there is nothing to lose and nothing to
 * confirm. The new set is shown on the codes page.
 *
 * A shopper without two-step verification has no codes to replace
 * (allauth answers 404) and goes back to the Security page.
 */
const { getRecoveryCodes, generateRecoveryCodes } = useAllAuthAccount()
const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()

const { data, error } = await useAsyncData('recoveryCodes', () => getRecoveryCodes())

if (error.value) {
  toast.add({ title: t('auth.mfa.required'), color: 'error' })
  await navigateTo(localePath('account-security'))
}

const unused = computed(() => data.value?.data.unused_code_count ?? 0)

const confirmed = ref(false)
const loading = ref(false)

const ready = computed(() => unused.value === 0 || confirmed.value)

async function generate() {
  if (!ready.value) return
  loading.value = true
  try {
    await generateRecoveryCodes()
    toast.add({ title: t('generated'), color: 'success' })
    await navigateTo(localePath('account-2fa-recovery-codes'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <UAlert
      v-if="unused > 0"
      :title="t('existing.title', unused)"
      :description="t('existing.description')"
      icon="i-lucide-triangle-alert"
      color="warning"
      variant="soft"
    />
    <p
      v-else
      class="text-sm text-toned"
    >
      {{ t('none') }}
    </p>

    <ul class="flex list-disc flex-col gap-1 ps-5 text-sm text-toned">
      <li>{{ t('points.new_set') }}</li>
      <li>{{ t('points.once') }}</li>
      <li>{{ t('points.keep') }}</li>
    </ul>

    <UCheckbox
      v-if="unused > 0"
      v-model="confirmed"
      :label="t('confirm')"
    />

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        :label="t('generate')"
        :loading="loading"
        :disabled="!ready"
        color="neutral"
        @click="generate"
      />
      <UButton
        :label="t('cancel')"
        :to="unused > 0 ? localePath('account-2fa-recovery-codes') : localePath('account-security')"
        color="neutral"
        variant="ghost"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  existing:
    title: "Δεν σου απομένει κανένας κωδικός | Σου απομένει {n} κωδικός | Σου απομένουν {n} κωδικοί"
    description: Οι νέοι κωδικοί ακυρώνουν όλους τους παλιούς, που θα πάψουν να λειτουργούν αμέσως.
  none: Δεν έχεις κωδικούς ανάκτησης. Δημιούργησε ένα σετ για την περίπτωση που δεν έχεις μαζί τη συσκευή σου.
  points:
    new_set: Δημιουργείται ένα νέο σετ κωδικών.
    once: Ο καθένας ισχύει μία φορά.
    keep: Φύλαξέ τους κάπου ασφαλές, π.χ. σε διαχειριστή κωδικών ή τυπωμένους.
  confirm: Κατανοώ ότι οι παλιοί κωδικοί θα ακυρωθούν
  generate: Δημιουργία κωδικών
  cancel: Άκυρο
  generated: Οι νέοι κωδικοί δημιουργήθηκαν. Φύλαξέ τους τώρα.
en:
  existing:
    title: "You have no codes left | You have {n} code left | You have {n} codes left"
    description: New codes cancel all the old ones, which stop working at once.
  none: You have no recovery codes. Make a set for when you do not have your device with you.
  points:
    new_set: A new set of codes is made.
    once: Each one works once.
    keep: Keep them somewhere safe, such as a password manager or on paper.
  confirm: I understand the old codes will be cancelled
  generate: Generate codes
  cancel: Cancel
  generated: Your new codes are ready. Keep them safe now.
</i18n>
