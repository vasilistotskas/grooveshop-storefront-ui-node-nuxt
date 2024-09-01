<script lang="ts" setup>
import { z } from 'zod'
import { AuthChangeEvent, type AuthChangeEventType, Flows, type ReauthenticateBody } from '~/types/all-auth'
import type { DynamicFormSchema } from '~/types/form'

const emit = defineEmits(['reauthenticate'])

const { reauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()

const loading = ref(false)

watchEffect(async () => {
  if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
    await navigateTo(localePath('/'))
  }
})

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
    handleAllAuthClientError(error)
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
      <Account2FaReauthenticateFlow :flow="Flows.REAUTHENTICATE">
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
      </Account2FaReauthenticateFlow>
    </PageBody>
  </PageWrapper>
</template>
