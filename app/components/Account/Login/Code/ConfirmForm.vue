<script lang="ts" setup>
import * as z from 'zod'

const emit = defineEmits(['confirmLoginCode'])

const { confirmLoginCode } = useAllAuthAuthentication()
const toast = useToast()
const { t } = useI18n()
const { $i18n } = useNuxtApp()

const loading = ref(false)

async function onSubmit(values: CodeConfirmBody) {
  try {
    loading.value = true
    await confirmLoginCode(values)
    toast.add({
      title: t('logged_in'),
      color: 'success',
    })
    emit('confirmLoginCode')
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
