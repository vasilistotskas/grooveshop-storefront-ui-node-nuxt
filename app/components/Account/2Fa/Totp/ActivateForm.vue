<script lang="ts" setup>
const emit = defineEmits(['activateTotp'])

const { t } = useStoreI18n('components/Account/2Fa/Totp/ActivateForm')
const localePath = useLocalePath()

const { status, isSupported, totpSecret, totpSvg, code, loading, isCodeComplete, copySecret: onSecretClick, activate } = await useTotpActivation({
  messages: {
    codeLength: () => t('error.code_length'),
    codeNumeric: () => t('error.code_numeric'),
    invalidTitle: () => t('error.validation'),
    copied: () => t('copied'),
    activated: () => ({ title: t('success.title'), description: t('success.totp_activated'), color: 'success' }),
  },
})

// Four characters a group reads and compares against the app far more
// easily than sixteen in a row; the copy button still copies the raw key.
const groupedSecret = computed(() => totpSecret.value.replace(/(.{4})(?=.)/g, '$1 '))

async function onSubmit() {
  if (await activate()) emit('activateTotp')
}
</script>

<template>
  <section
    v-if="status === 'pending'"
    class="rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
  >
    <div class="flex flex-col gap-6">
      <USkeleton class="h-5 w-64" />
      <USkeleton class="size-48 rounded-2xl" />
      <USkeleton class="h-5 w-48" />
      <USkeleton class="h-12 w-80 max-w-full" />
    </div>
  </section>

  <section
    v-else-if="totpSecret && totpSvg"
    class="rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6"
  >
    <ol class="flex flex-col gap-8">
      <li class="flex flex-col gap-4">
        <h2 class="flex items-baseline gap-2 font-semibold text-highlighted">
          <span class="text-accent">1</span>
          {{ t('scan_title') }}
        </h2>

        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            role="img"
            :aria-label="t('qr_code_alt')"
            class="
              w-fit rounded-2xl bg-white p-4 ring ring-default
              [&_svg]:size-44
            "
            v-html="totpSvg"
          />

          <div class="flex flex-col gap-2">
            <p class="text-sm text-toned">
              {{ t('cant_scan') }}
            </p>
            <div class="flex w-fit max-w-full items-center gap-2 rounded-xl bg-elevated py-2 ps-4 pe-2 ring ring-default">
              <code class="font-mono text-sm tracking-wider break-all text-highlighted">{{ groupedSecret }}</code>
              <!-- ClientOnly: the clipboard is unknown while rendering on the
                   server, so the button would appear between the server's
                   DOM and the hydrated one. -->
              <ClientOnly>
                <UButton
                  v-if="isSupported"
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :aria-label="t('copy_secret')"
                  @click="onSecretClick"
                />
              </ClientOnly>
            </div>
          </div>
        </div>
      </li>

      <li class="flex flex-col gap-4">
        <h2 class="flex items-baseline gap-2 font-semibold text-highlighted">
          <span class="text-accent">2</span>
          {{ t('code_title') }}
        </h2>

        <UPinInput
          v-model="code"
          :length="6"
          type="number"
          otp
          size="xl"
          class="w-fit"
          @complete="onSubmit"
        />
      </li>
    </ol>

    <div class="mt-8 flex flex-wrap items-center gap-3">
      <UButton
        size="lg"
        color="neutral"
        :loading="loading"
        :disabled="!isCodeComplete"
        :label="t('activate')"
        @click="onSubmit"
      />
      <UButton
        size="lg"
        color="neutral"
        variant="ghost"
        :label="t('cancel')"
        :to="localePath('account-security')"
      />
    </div>
  </section>

  <UAlert
    v-else
    color="error"
    variant="soft"
    icon="i-lucide-triangle-alert"
    :title="t('error.failed_to_load')"
    :description="t('error.failed_to_load_description')"
  />
</template>

<i18n lang="yaml">
el:
  qr_code_alt: Κωδικός QR για ρύθμιση ελέγχου ταυτότητας δύο παραγόντων
  scan_title: Σάρωσε με την εφαρμογή επαλήθευσης
  cant_scan: Δεν μπορείς να σαρώσεις; Εισήγαγε αυτό το κλειδί.
  copy_secret: Αντιγραφή κλειδιού
  code_title: Εισήγαγε τον κωδικό 6 ψηφίων
  activate: Ενεργοποίηση
  copied: Αντιγράφηκε στο πρόχειρο
  success:
    totp_activated: Ο έλεγχος ταυτότητας δύο παραγόντων ενεργοποιήθηκε επιτυχώς
  error:
    validation: Σφάλμα επαλήθευσης
    code_length: Ο κωδικός πρέπει να έχει ακριβώς 6 ψηφία
    code_numeric: Ο κωδικός πρέπει να περιέχει μόνο αριθμούς
    failed_to_load: Αποτυχία φόρτωσης δεδομένων
    failed_to_load_description: Δεν ήταν δυνατή η φόρτωση των δεδομένων TOTP. Παρακαλώ δοκίμασε ξανά.
en:
  qr_code_alt: QR code for setting up two-factor authentication
  scan_title: Scan with your authenticator app
  cant_scan: Can't scan? Enter this key instead.
  copy_secret: Copy the key
  code_title: Enter the 6-digit code
  activate: Activate
  copied: Copied to the clipboard
  success:
    totp_activated: Two-factor authentication is on
  error:
    validation: Verification failed
    code_length: The code must be exactly 6 digits
    code_numeric: The code may contain only numbers
    failed_to_load: Could not load
    failed_to_load_description: We could not load the TOTP data. Please try again.
</i18n>
