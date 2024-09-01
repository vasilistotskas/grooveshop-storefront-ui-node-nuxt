<script lang="ts" setup>
import type { PropType } from 'vue'
import { z } from 'zod'
import { type AuthenticatorTypeValues, Flows, type TwoFaAuthenticateBody } from '~/types/all-auth'
import type { DynamicFormSchema } from '~/types/form'

const props = defineProps({
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

const loading = ref(false)

const { twoFaAuthenticate } = useAllAuthAuthentication()
const { authenticatorType } = toRefs(props)

watchEffect(async () => {
  if (authInfo?.pendingFlow?.id !== Flows.MFA_AUTHENTICATE) {
    await navigateTo(localePath('/'))
  }
})

const formSchema: DynamicFormSchema = {
  fields: [
    {
      name: 'code',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }),
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
    await twoFaAuthenticate({
      code: values.code,
    })
    toast.add({
      title: t('common.success.logged_in'),
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
      :button-label="t('common.entry')"
      :schema="formSchema"
      class="grid"
      @submit="onSubmit"
    />
  </Account2FaAuthenticateFlow>
</template>
