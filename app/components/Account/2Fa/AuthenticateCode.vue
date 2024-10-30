<script lang="ts" setup>
import type { PropType } from 'vue'
import { z } from 'zod'
import { type AuthenticatorTypeValues, Flows, type TwoFaAuthenticateBody } from '~/types/all-auth'
import type { DynamicFormSchema } from '~/types/form'

defineProps({
  authenticatorType: { type: String as PropType<AuthenticatorTypeValues>, required: true },
})

defineSlots<{
  default(props: object): any
}>()

const emit = defineEmits(['twoFaAuthenticate'])

const authInfo = useAuthInfo()
const toast = useToast()
const { t } = useI18n()
const localePath = useLocalePath()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)

const loading = ref(false)

const { twoFaAuthenticate } = useAllAuthAuthentication()

if (authInfo?.pendingFlow?.id !== Flows.MFA_AUTHENTICATE) {
  await navigateTo(localePath('/'))
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      name: 'code',
      as: 'input',
      rules: z.string({ required_error: t('validation.required') }),
      autocomplete: 'one-time-code',
      readonly: false,
      required: true,
      placeholder: '123456',
      type: 'text',
    },
  ],
}

async function onSubmit(values: TwoFaAuthenticateBody) {
  try {
    loading.value = true
    const response = await twoFaAuthenticate({
      code: values.code,
    })
    session.value = response?.data
    toast.add({
      title: t('success.logged_in'),
      color: 'green',
    })
    emit('twoFaAuthenticate')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}
</script>

<template>
  <Account2FaAuthenticateFlow :authenticator-type="authenticatorType">
    <slot />
    <DynamicForm
      :button-label="t('entry')"
      :schema="formSchema"
      class="grid"
      @submit="onSubmit"
    />
  </Account2FaAuthenticateFlow>
</template>
