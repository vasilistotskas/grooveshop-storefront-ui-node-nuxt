<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['getWebAuthnCreateOptions', 'addWebAuthnCredential'])

const { getWebAuthnCreateOptions, addWebAuthnCredential } = useAllAuthAccount()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: {
  name: string
  passwordless: boolean
}) {
  try {
    loading.value = true
    const optResp = await getWebAuthnCreateOptions(values.passwordless)
    const jsonOptions = optResp?.data.creation_options.publicKey
    if (!jsonOptions) {
      throw new Error('No creation options')
    }
    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(jsonOptions)
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential
    const response = await addWebAuthnCredential({
      name: values.name,
      credential: credential.toJSON(),
    })
    toast.add({
      title: $i18n.t('success.title'),
      color: 'success',
    })
    emit('getWebAuthnCreateOptions')
    emit('addWebAuthnCredential')
    const to = response?.meta.recovery_codes_generated ? 'account-2fa-recovery-codes' : 'account-2fa-webauthn'
    await navigateTo(localePath(to))
  }
  catch (error) {
    toast.add({
      title: $i18n.t('error.default'),
      description: error instanceof Error ? error.message : $i18n.t('error.webauthn_failed'),
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      label: $i18n.t('name'),
      name: 'name',
      as: 'input',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
      autocomplete: 'name',
      readonly: false,
      required: true,
      placeholder: t('name_placeholder'),
      type: 'text',
      condition: () => true,
      disabledCondition: () => false,
    },
    {
      label: t('passwordless'),
      name: 'passwordless',
      as: 'checkbox',
      rules: z.boolean(),
      autocomplete: 'passwordless',
      readonly: false,
      required: false,
      placeholder: t('passwordless'),
      type: 'checkbox',
      initialValue: false,
      condition: () => true,
      disabledCondition: () => false,
    },
  ],
}))
</script>

<template>
  <section
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />
    <div class="w-full space-y-6">
      <UCard>
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-information-circle"
          :title="t('alert.title')"
          :description="t('alert.description')"
        />

        <div class="space-y-4 pt-4 pb-4">
          <div>
            <h3 class="mb-2 text-lg font-semibold">
              {{ t('add_key_title') }}
            </h3>
            <p class="text-sm text-muted">
              {{ t('add_key_description') }}
            </p>
          </div>

          <UAlert
            color="info"
            variant="soft"
            icon="i-heroicons-light-bulb"
          >
            <template #title>
              {{ t('tip.title') }}
            </template>
            <template #description>
              <ul class="mt-2 list-inside list-disc space-y-1 text-sm">
                <li>{{ t('tip.browser') }}</li>
                <li>{{ t('tip.device') }}</li>
                <li>{{ t('tip.passwordless') }}</li>
              </ul>
            </template>
          </UAlert>
        </div>

        <DynamicForm
          class="!flex flex-col"
          :button-label="$i18n.t('submit')"
          :schema="formSchema"
          :loading="loading"
          @submit="onSubmit"
        />
      </UCard>
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  name_placeholder: π.χ. "YubiKey μου" ή "Τηλέφωνο εργασίας"
  add_key_title: Προσθήκη νέου κλειδιού ασφαλείας
  add_key_description: Δώσε ένα περιγραφικό όνομα στο κλειδί σου για να το αναγνωρίζεις εύκολα.
  passwordless: Χωρίς κωδικό
  alert:
    title: Τι είναι το WebAuthn;
    description: Το WebAuthn σου επιτρέπει να χρησιμοποιήσεις κλειδιά ασφαλείας (όπως YubiKey) ή βιομετρικά στοιχεία (όπως αναγνώριση προσώπου ή δακτυλικών αποτυπωμάτων) για ασφαλή σύνδεση στον λογαριασμό σου.
  tip:
    title: Συμβουλές
    browser: Βεβαιώσου ότι το πρόγραμμα περιήγησής σου υποστηρίζει WebAuthn
    device: Έχεις έτοιμο το κλειδί ασφαλείας ή τη συσκευή σου
    passwordless: Η επιλογή "Χωρίς κωδικό" σου επιτρέπει να συνδεθείς χωρίς κωδικό πρόσβασης
  error:
    webauthn_failed: Η διαδικασία WebAuthn απέτυχε. Δοκίμασε ξανά.
</i18n>
