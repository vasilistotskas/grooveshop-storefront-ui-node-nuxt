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
      label: t('name'),
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
      grid gap-6
      lg:flex
    "
  >
    <slot />
    <div class="flex w-full flex-col gap-4">
      <UAlert
        color="info"
        variant="soft"
        icon="i-heroicons-information-circle"
        :title="t('alert.title')"
        :description="t('alert.description')"
      />

      <div class="space-y-4">
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
    </div>
  </section>
</template>

<i18n lang="yaml">
el:
  name_placeholder: π.χ. "YubiKey μου" ή "Τηλέφωνο εργασίας"
  add_key_title: Προσθήκη νέου κλειδιού ασφαλείας
  add_key_description: Δώστε ένα περιγραφικό όνομα στο κλειδί σας για να το αναγνωρίζετε εύκολα.
  passwordless: Χωρίς κωδικό
  alert:
    title: Τι είναι το WebAuthn;
    description: Το WebAuthn σας επιτρέπει να χρησιμοποιείτε κλειδιά ασφαλείας (όπως YubiKey) ή βιομετρικά στοιχεία (όπως αναγνώριση προσώπου ή δακτυλικών αποτυπωμάτων) για ασφαλή σύνδεση στον λογαριασμό σας.
  tip:
    title: Συμβουλές
    browser: Βεβαιωθείτε ότι το πρόγραμμα περιήγησής σας υποστηρίζει WebAuthn
    device: Έχετε έτοιμο το κλειδί ασφαλείας ή τη συσκευή σας
    passwordless: Η επιλογή "Χωρίς κωδικό" σας επιτρέπει να συνδεθείτε χωρίς κωδικό πρόσβασης
  error:
    webauthn_failed: Η διαδικασία WebAuthn απέτυχε. Δοκιμάστε ξανά.
</i18n>
