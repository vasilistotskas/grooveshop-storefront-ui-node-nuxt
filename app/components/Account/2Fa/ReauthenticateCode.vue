<script lang="ts" setup>
import { z } from 'zod'
import type { TwoFaReauthenticateBody } from '~/types/all-auth'
import type { DynamicFormSchema } from '~/types/form'

const emit = defineEmits(['twoFaReauthenticate'])

defineSlots<{
  default(props: object): any
}>()

const { twoFaReauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

async function onSubmit(values: TwoFaReauthenticateBody) {
  try {
    loading.value = true
    await twoFaReauthenticate({
      code: values.code,
    })
    toast.add({
      title: t('common.success.title'),
      color: 'green',
    })
    emit('twoFaReauthenticate')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      name: 'code',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }),
      autocomplete: 'one-time-code',
      readonly: false,
      required: true,
      placeholder: t('common.code'),
      type: 'text',
    },
  ],
}
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.2fa.reauthenticate.title')" class="
        text-center capitalize
      "
    />
    <PageBody>
      <Account2FaReauthenticateFlow>
        <slot />
        <div class="grid items-center justify-center gap-2">
          <h3
            class="
              text-2xl font-bold text-primary-950

              dark:text-primary-50
            "
          >
            {{ $t('common.enter_authenticator_code') }}
          </h3>
          <section class="grid items-center">
            <DynamicForm
              :button-label="t('common.submit')"
              :schema="formSchema"
              @submit="onSubmit"
            />
          </section>
        </div>
      </Account2FaReauthenticateFlow>
    </pagebody>
  </PageWrapper>
</template>
