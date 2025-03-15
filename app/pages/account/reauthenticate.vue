<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['reauthenticate'])

const { reauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n({ useScope: 'local' })
const authEvent = useState<AuthChangeEventType>('authEvent')
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const loading = ref(false)

if (authEvent.value !== AuthChangeEvent.REAUTHENTICATION_REQUIRED) {
  await navigateTo(localePath('index'))
}

async function onSubmit(values: ReauthenticateBody) {
  try {
    loading.value = true
    await reauthenticate({
      password: values.password,
    })
    toast.add({
      title: t('success.title'),
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
      rules: z.string({ required_error: $i18n.t('validation.required') }),
      autocomplete: 'current-password',
      readonly: false,
      required: true,
      placeholder: t('password.title'),
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
      :text="t('title')" class="text-center capitalize"
    />

    <Account2FaReauthenticateFlow :flow="Flows.REAUTHENTICATE">
      <div class="grid items-center justify-center gap-2">
        <h3
          class="
              text-primary-950 text-2xl font-bold

              dark:text-primary-50
            "
        >
          {{ $i18n.t('enter_password') }}
        </h3>
        <section class="grid items-center">
          <DynamicForm
            :button-label="$i18n.t('submit')"
            :schema="formSchema"
            @submit="onSubmit"
          />
        </section>
      </div>
    </Account2FaReauthenticateFlow>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επαναπιστοποίηση
</i18n>
