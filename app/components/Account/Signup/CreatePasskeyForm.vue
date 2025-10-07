<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['getWebAuthnCreateOptionsAtSignup', 'signupWebAuthnCredential'])

const { getWebAuthnCreateOptionsAtSignup, signupWebAuthnCredential } = useAllAuthAuthentication()
const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const authInfo = useAuthInfo()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: {
  name: string
}) {
  try {
    loading.value = true
    const optResp = await getWebAuthnCreateOptionsAtSignup()
    const jsonOptions = optResp?.data.request_options.publicKey
    if (!jsonOptions) {
      throw new Error('No creation options')
    }
    const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(jsonOptions)
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential
    await signupWebAuthnCredential({
      name: values.name,
      credential: credential.toJSON(),
    })
    toast.add({
      title: $i18n.t('success.title'),
      description: t('success.description'),
      color: 'success',
    })
    emit('getWebAuthnCreateOptionsAtSignup')
    emit('signupWebAuthnCredential')
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      if (error.data.data.status === 409 || authInfo.pendingFlow?.id !== Flows.MFA_WEBAUTHN_SIGNUP) {
        await navigateTo(localePath('account-signup-passkey'))
      }
    }
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
      placeholder: $i18n.t('name'),
      type: 'text',
      condition: () => true,
      disabledCondition: () => false,
    },
  ],
}))
</script>

<template>
  <div
    class="
      container mx-auto p-0
      md:px-6
    "
  >
    <section class="grid items-center">
      <DynamicForm
        :button-label="$i18n.t('submit')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
    <UButton
      :label="t('using_password')"
      :to="localePath('account-signup')"
      color="secondary"
      size="lg"
      type="submit"
      variant="link"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  using_password: Εγγράψου με κωδικό
  name: Όνομα
  submit: Υποβολή
  validation:
    required: Απαιτείται
  success:
    title: Επιτυχία
    description: Η εγγραφή ολοκληρώθηκε
</i18n>
