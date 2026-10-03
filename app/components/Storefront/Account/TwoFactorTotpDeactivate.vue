<script lang="ts" setup>
const emit = defineEmits(['deactivateTotp'])

const { deactivateTotp, totpAuthenticatorStatus } = useAllAuthAccount()
const { t } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
const toast = useToast()
const localePath = useLocalePath()

const loading = ref(false)
const showConfirmation = ref(false)

const consequences = computed(() => [
  t('info.consequence1'),
  t('info.consequence2'),
  t('info.consequence3'),
])

const { error, refresh } = await useAsyncData(
  'totpAuthenticatorStatus',
  () => totpAuthenticatorStatus(),
)

watchEffect(async () => {
  if (error.value) {
    await navigateTo(localePath('account-security'))
  }
})

async function onConfirm() {
  try {
    loading.value = true
    await deactivateTotp()

    toast.add({
      title: t('success.title'),
      description: t('success.description'),
      color: 'success',
      icon: 'i-lucide-shield-check',
    })

    emit('deactivateTotp')
    await navigateTo(localePath('account-security'))
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

onReactivated(async () => {
  await refresh()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="t('title')" />

    <AccountSection
      :title="t('info.paragraph1')"
      :description="t('warning.description')"
    >
      <div class="flex flex-col gap-3">
        <h3 class="text-sm font-medium text-highlighted">
          {{ t('info.consequences_title') }}
        </h3>
        <ul class="flex flex-col gap-2 text-sm text-toned">
          <li
            v-for="consequence in consequences"
            :key="consequence"
            class="flex items-start gap-2"
          >
            <UIcon
              name="i-lucide-x"
              class="mt-0.5 size-4 shrink-0"
            />
            <span>{{ consequence }}</span>
          </li>
        </ul>
      </div>

      <UCheckbox
        v-model="showConfirmation"
        color="neutral"
        :label="t('confirmation.checkbox')"
        :ui="{ label: 'text-sm font-medium' }"
      />

      <div class="flex flex-wrap items-center gap-3">
        <UButton
          :label="t('deactivate')"
          color="error"
          size="lg"
          :loading="loading"
          :disabled="!showConfirmation"
          @click="onConfirm"
        />
        <UButton
          :label="t('cancel')"
          color="neutral"
          variant="ghost"
          size="lg"
          :disabled="loading"
          :to="localePath('account-security')"
        />
      </div>
    </AccountSection>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Απενεργοποίηση επαλήθευσης δύο βημάτων
  deactivate: Απενεργοποίηση
  warning:
    description: Η απενεργοποίηση του TOTP θα μειώσει την ασφάλεια του λογαριασμού σου. Σιγουρέψου ότι έχεις εναλλακτικά μέτρα ασφαλείας.
  info:
    paragraph1: Είσαι σίγουρος ότι θέλεις να απενεργοποιήσεις την εφαρμογή ελέγχου ταυτότητας;
    consequences_title: Τι θα συμβεί αν απενεργοποιήσετε το TOTP
    consequence1: Δεν θα χρειάζεται πλέον κωδικός επαλήθευσης κατά τη σύνδεση
    consequence2: Ο λογαριασμός σου θα είναι λιγότερο ασφαλής
    consequence3: Θα πρέπει να ρυθμίσεις ξανά το TOTP αν το ενεργοποιήσεις στο μέλλον
  confirmation:
    checkbox: Κατανοώ τους κινδύνους και θέλω να συνεχίσω
  success:
    description: Η εφαρμογή ελέγχου ταυτότητας απενεργοποιήθηκε επιτυχώς
en:
  title: Turn off two-step verification
  deactivate: Turn off
  warning:
    description: Turning TOTP off makes your account less secure. Make sure you have another safeguard in place.
  info:
    paragraph1: Are you sure you want to turn off your authenticator app?
    consequences_title: What happens if you turn TOTP off
    consequence1: You will no longer need a verification code to sign in
    consequence2: Your account will be less secure
    consequence3: You will have to set TOTP up again if you turn it back on
  confirmation:
    checkbox: I understand the risks and want to continue
  success:
    description: Your authenticator app has been turned off
</i18n>
