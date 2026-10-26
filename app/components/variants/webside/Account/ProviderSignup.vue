<script lang="ts" setup>
const { t } = useI18n()
const emit = defineEmits(['providerSignup'])

const { schema, submit } = useProviderSignup({
  success: () => ({ title: t('success.title'), color: 'success' }),
  onSignedUp: () => emit('providerSignup'),
})

const onSubmit = (values: { email: string }) => submit(values)

const formSchema = computed(() => ({
  fields: [
    {
      label: t('email.title'),
      name: 'email',
      as: 'input',
      rules: schema.shape.email,
      ui: {
        root: 'w-full',
      },
      autocomplete: 'email',
      readonly: false,
      required: true,
      condition: () => true,
      disabledCondition: () => false,
      placeholder: t('email.title'),
      type: 'email',
    },
  ],
} as const satisfies DynamicFormSchema))
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
        :button-label="t('submit')"
        :schema="formSchema"
        @submit="onSubmit"
      />
    </section>
  </div>
</template>
