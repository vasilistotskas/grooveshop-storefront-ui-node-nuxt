<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['twoFaReauthenticate'])

defineSlots<{
  default(props: object): any
}>()

const { twoFaReauthenticate } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n({ useScope: 'local' })
const authStore = useAuthStore()
const { session } = storeToRefs(authStore)
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: TwoFaReauthenticateBody) {
  try {
    loading.value = true
    const response = await twoFaReauthenticate({
      code: values.code,
    })
    session.value = response?.data
    toast.add({
      title: $i18n.t('success.title'),
      color: 'success',
    })
    emit('twoFaReauthenticate')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
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
      placeholder: $i18n.t('code'),
      type: 'text',
      condition: () => true,
      disabledCondition: () => false,
    },
  ],
}))
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4

      md:gap-8
    "
  >
    <PageTitle
      :text="t('title')" class="text-center capitalize"
    />

    <Account2FaReauthenticateFlow>
      <slot />
      <div class="grid items-center justify-center gap-2">
        <h3
          class="
              text-primary-950 text-2xl font-bold

              dark:text-primary-50
            "
        >
          {{ t('enter_authenticator_code') }}
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
  title: Επαλήθευση
  enter_authenticator_code: Εισάγετε τον κωδικό πολλαπλών παραγόντων
</i18n>
