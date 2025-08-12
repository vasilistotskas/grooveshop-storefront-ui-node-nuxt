<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['requestLoginCode'])

const { requestLoginCode } = useAllAuthAuthentication()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: CodeRequestBody) {
  try {
    loading.value = true
    await requestLoginCode(values)
    emit('requestLoginCode')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      name: 'email',
      as: 'input',
      rules: z.email({
        error: issue => issue.input === undefined
          ? $i18n.t('validation.required')
          : $i18n.t('validation.email.valid'),
      }),
      autocomplete: 'email',
      readonly: false,
      required: true,
      placeholder: $i18n.t('email.title'),
      type: 'email',
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
  </div>
</template>
