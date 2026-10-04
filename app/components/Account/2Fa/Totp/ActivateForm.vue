<script lang="ts" setup>
import DOMPurify from 'isomorphic-dompurify'
import * as z from 'zod'

const emit = defineEmits(['activateTotp'])

const nuxtApp = useNuxtApp()
const { activateTotp, totpAuthenticatorStatus } = useAllAuthAccount()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const loading = ref(false)
const code = ref<number[]>([])

const { data, error, status } = await useAsyncData(
  'totpAuthenticatorStatus',
  () => totpAuthenticatorStatus(),
  {
    getCachedData(key) {
      return nuxtApp.payload.data[key] || nuxtApp.static.data[key]
    },
  },
)

const totpSecret = computed(() => {
  if (!data.value) {
    return ''
  }
  if (!('meta' in data.value)) {
    return ''
  }
  return data.value?.meta.secret ?? ''
})

const totpSvg = computed(() => {
  if (!data.value) {
    return ''
  }
  if (!('meta' in data.value)) {
    return ''
  }
  return DOMPurify.sanitize(data.value?.meta.totp_svg ?? '', { USE_PROFILES: { svg: true } })
})

// Four characters a group reads and compares against the app far more
// easily than sixteen in a row; the copy button still copies the raw key.
const groupedSecret = computed(() => totpSecret.value.replace(/(.{4})(?=.)/g, '$1 '))

watchEffect(async () => {
  if (error.value) {
    await navigateTo(localePath('account-security'))
  }
})

const { copy, isSupported } = useClipboard({ source: totpSecret.value })

// Six filled cells, by reka-ui's own rule: in number mode the digit zero
// is the number 0, a filled cell — a "falsy is empty" test kept the
// button disabled for every code containing a zero.
const isCodeComplete = computed(() =>
  code.value.filter(digit => digit === 0 || !!digit).length === 6,
)

const codeSchema = computed(() => z.string()
  .min(6, { message: t('error.code_length') })
  .max(6, { message: t('error.code_length') })
  .regex(/^\d+$/, { message: t('error.code_numeric') }),
)

const onSecretClick = () => {
  if (isSupported.value) {
    copy(totpSecret.value)
    toast.add({
      title: t('copied'),
      color: 'success',
    })
  }
}

async function onSubmit() {
  try {
    const codeString = code.value.join('')
    const validation = codeSchema.value.safeParse(codeString)

    if (!validation.success) {
      toast.add({
        title: t('error.validation'),
        description: validation.error?.issues[0]?.message,
        color: 'error',
      })
      return
    }

    loading.value = true
    await activateTotp({ code: codeString })

    toast.add({
      title: t('success.title'),
      description: t('success.totp_activated'),
      color: 'success',
    })

    emit('activateTotp')
    await navigateTo(localePath('account-security'))
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
