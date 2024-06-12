<script lang="ts" setup>
import { z } from 'zod'
import { Flows, type ReauthenticateBody } from '~/types/all-auth'
import type { DynamicFormSchema } from '~/types/form'

const emit = defineEmits(['reauthenticate'])

const { reauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

async function onSubmit(values: ReauthenticateBody) {
  try {
    loading.value = true
    await reauthenticate({
      password: values.password,
    })
    toast.add({
      title: t('common.success.title'),
      color: 'green',
    })
    emit('reauthenticate')
  }
  catch (error) {
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
}

const formSchema: DynamicFormSchema = {
  fields: [
    {
      name: 'password',
      as: 'input',
      rules: z.string({ required_error: t('common.validation.required') }),
      autocomplete: 'current-password',
      readonly: false,
      required: true,
      placeholder: t('common.password.title'),
      type: 'password',
    },
  ],
}

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper
    class="
      container-3xs flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.reauthenticate.title')" class="
        text-center capitalize
      "
    />
    <PageBody>
      <AccountReauthenticateFlow :flow="Flows.REAUTHENTICATE">
        <div class="grid items-center justify-center gap-2">
          <h3
            class="
              text-2xl font-bold text-primary-950

              dark:text-primary-50
            "
          >
            {{ $t('common.enter_password') }}
          </h3>
          <section class="grid items-center">
            <DynamicForm
              :button-label="$t('common.submit')"
              :schema="formSchema"
              @submit="onSubmit"
            />
          </section>
        </div>
      </AccountReauthenticateFlow>
    </PageBody>
  </PageWrapper>
</template>
