<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['activateTotp'])

const nuxtApp = useNuxtApp()
const { activateTotp, totpAuthenticatorStatus } = useAllAuthAccount()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

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
  return data.value?.meta.secret
})

const totpSvg = computed(() => {
  if (!data.value) {
    return ''
  }
  if (!('meta' in data.value)) {
    return ''
  }
  return data.value?.meta.totp_svg
})

watchEffect(async () => {
  if (error.value) {
    await navigateTo(localePath('account-settings'))
  }
})

const { copy, isSupported } = useClipboard({ source: totpSecret.value })

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
      title: $i18n.t('success.title'),
      description: t('success.totp_activated'),
      color: 'success',
    })

    emit('activateTotp')
    await navigateTo(localePath('account-settings'))
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
  <div
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />

    <div
      v-if="status === 'pending'"
      class="
        grid items-center justify-center justify-items-center gap-4
        md:gap-8
        lg:flex-1
      "
    >
      <UCard class="w-full max-w-2xl">
        <div class="grid items-center justify-center justify-items-center gap-6">
          <USkeleton class="size-48 rounded-md" />
          <div class="grid w-full gap-2">
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-10 w-full" />
            <USkeleton class="h-4 w-64" />
          </div>
          <USkeleton class="h-10 w-32" />
        </div>
      </UCard>
    </div>

    <div
      v-else-if="totpSecret && totpSvg"
      class="
        grid items-center justify-center justify-items-center gap-4
        md:gap-8
        lg:flex-1
      "
    >
      <UCard class="w-full max-w-2xl">
        <div class="grid items-center justify-center justify-items-center gap-6">
          <UAlert
            color="info"
            variant="soft"
            icon="i-heroicons-information-circle"
            :title="t('setup_instructions')"
            :description="t('setup_instructions_description')"
            class="w-full"
          />

          <div
            class="grid items-center justify-center justify-items-center gap-4"
          >
            <h3 class="text-lg font-semibold">
              {{ t('scan_qr_code') }}
            </h3>

            <div
              class="
                rounded-lg bg-primary-200 p-4
                dark:bg-primary-800
              "
              v-html="totpSvg"
            />
          </div>

          <div class="grid w-full gap-3">
            <label
              class="
                text-sm font-medium text-primary-950
                dark:text-primary-50
              "
            >
              {{ t('authenticator_secret') }}:
            </label>

            <UInput
              v-model="totpSecret"
              :ui="{
                root: 'w-full',
                base: 'cursor-pointer text-center font-mono tracking-wider',
              }"
              readonly
              type="text"
              @click="onSecretClick"
            />

            <p class="text-center text-xs text-muted">
              {{ t('authenticator_secret_description') }}
            </p>
          </div>

          <div class="grid w-full gap-4 border-t border-default pt-4">
            <label
              class="
                text-center text-sm font-medium text-primary-950
                dark:text-primary-50
              "
            >
              {{ t('enter_verification_code') }}
            </label>

            <div class="flex justify-center">
              <UPinInput
                v-model="code"
                :length="6"
                type="number"
                otp
                :placeholder="'0'"
                size="lg"
                @complete="onSubmit"
              />
            </div>

            <p class="text-center text-xs text-muted">
              {{ t('verification_code_help') }}
            </p>
          </div>

          <UButton
            size="lg"
            color="neutral"
            variant="outline"
            :loading="loading"
            :disabled="code.length !== 6 || code.some(c => !c)"
            class="
              w-full
              sm:w-auto
            "
            @click="onSubmit"
          >
            {{ $i18n.t('entry') }}
          </UButton>
        </div>
      </UCard>
    </div>

    <div
      v-else class="grid items-center justify-center justify-items-center gap-4"
    >
      <UAlert
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        :title="t('error.failed_to_load')"
        :description="t('error.failed_to_load_description')"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  authenticator_code: Κωδικός
  authenticator_secret: Μυστικό κλειδί
  authenticator_secret_description: Μπορείς να αποθηκεύσεις αυτό το μυστικό κλειδί και να το χρησιμοποιήσεις για να επανεγκαταστήσεις την εφαρμογή ελέγχου ταυτότητας σε μεταγενέστερο χρόνο.
  setup_instructions: Οδηγίες ενεργοποίησης
  setup_instructions_description: Σάρωσε τον κωδικό QR με την εφαρμογή ελέγχου ταυτότητας (Google Authenticator, Authy, κλπ.) ή εισάγαγε το μυστικό κλειδί χειροκίνητα.
  scan_qr_code: Σάρωσε τον κωδικό QR
  enter_verification_code: Εισάγαγε τον κωδικό επαλήθευσης
  verification_code_help: Εισάγαγε τον κωδικό 6 ψηφίων από την εφαρμογή σου
  copied: Αντιγράφηκε στο πρόχειρο
  success:
    totp_activated: Ο έλεγχος ταυτότητας δύο παραγόντων ενεργοποιήθηκε επιτυχώς
  error:
    validation: Σφάλμα επαλήθευσης
    code_length: Ο κωδικός πρέπει να έχει ακριβώς 6 ψηφία
    code_numeric: Ο κωδικός πρέπει να περιέχει μόνο αριθμούς
    failed_to_load: Αποτυχία φόρτωσης δεδομένων
    failed_to_load_description: Δεν ήταν δυνατή η φόρτωση των δεδομένων TOTP. Παρακαλώ δοκίμασε ξανά.
</i18n>
