<script lang="ts" setup>
import type { PropType } from 'vue'
import * as z from 'zod'

defineProps({
  authenticatorType: { type: String as PropType<AuthenticatorTypeValues>, required: true },
})

defineSlots<{
  default(props: object): any
}>()

const emit = defineEmits(['twoFaAuthenticate'])

const authInfo = useAuthInfo()
const toast = useToast()
const localePath = useLocalePath()
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)
const { $i18n } = useNuxtApp()

const loading = ref(false)

const { twoFaAuthenticate } = useAllAuthAuthentication()

if (authInfo?.pendingFlow?.id !== Flows.MFA_AUTHENTICATE) {
  await navigateTo(localePath('index'))
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      name: 'code',
      as: 'input',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
      autocomplete: 'one-time-code',
      readonly: false,
      required: true,
      placeholder: '123456',
      type: 'text',
      condition: () => true,
      disabledCondition: () => false,
    },
  ],
}))

async function onSubmit(values: TwoFaAuthenticateBody) {
  try {
    loading.value = true
    const response = await twoFaAuthenticate({
      code: values.code,
    })
    session.value = response?.data
    toast.add({
      title: $i18n.t('success.logged_in'),
      color: 'success',
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
      :button-label="$i18n.t('entry')"
      :schema="formSchema"
      class="grid"
      @submit="onSubmit"
    />
  </Account2FaAuthenticateFlow>
</template>
