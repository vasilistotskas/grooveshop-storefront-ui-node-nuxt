<script lang="ts" setup>
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const emit = defineEmits(['passwordReset'])

const { getPasswordReset, passwordReset } = useAllAuthAuthentication()

const { t } = useI18n({ useScope: 'local' })

const route = useRoute()
const toast = useToast()
const localePath = useLocalePath()

const key = 'key' in route.params
  ? route.params.key
  : undefined

if (!key) {
  navigateTo(localePath('/account/password/reset'))
}

await useAsyncData(
  'passwordReset',
  () => getPasswordReset(String(key)),
)

const ZodPasswordResetConfirm = z
  .object({
    newPassword1: z.string({ required_error: t('validation.required') }).min(8).max(255),
    newPassword2: z.string({ required_error: t('validation.required') }).min(8).max(255),
    key: z.string({ required_error: t('validation.required') }),
  })
  .refine(data => data.newPassword1 === data.newPassword2, {
    message: t(
      'form.newPassword2.errors.match',
    ),
    path: ['newPassword2'],
  })

const initialValues = {
  newPassword1: '',
  newPassword2: '',
  key,
}

const validationSchema = toTypedSchema(ZodPasswordResetConfirm)

const { defineField, handleSubmit, errors, isSubmitting, meta } = useForm({
  validationSchema,
  initialValues,
})

const [newPassword1, newPassword1Props] = defineField('newPassword1', {
  validateOnModelUpdate: true,
})
const [newPassword2, newPassword2Props] = defineField('newPassword2', {
  validateOnModelUpdate: true,
})

const onSubmit = handleSubmit(async (values) => {
  try {
    await passwordReset({
      password: values.newPassword1,
      key: values.key,
    })
    toast.add({
      title: t('password.reset.success'),
      color: 'green',
    })
    emit('passwordReset')
  }
  catch (error) {
    if (isAllAuthClientError(error)) {
      if (error.data.data.status === 401) {
        toast.add({
          title: t('password.reset.success'),
          color: 'green',
        })
        return navigateTo(localePath('/account/login'))
      }
      const errors = 'errors' in error.data.data ? error.data.data.errors : []
      errors.forEach((error) => {
        toast.add({
          title: error.message,
          color: 'red',
        })
      })
      return
    }
    toast.add({
      title: t('error.default'),
      color: 'red',
    })
  }
})
</script>

<template>
  <section class="grid">
    <form
      id="passwordResetConfirmForm"
      ref="passwordResetConfirmForm"
      class="
        container-2xs p-0

        md:px-20
      "
      name="passwordResetConfirmForm"
      @submit="onSubmit"
    >
      <div
        class="
          bg-primary-100 flex h-full flex-wrap items-center justify-center
          rounded-[0.5rem] p-4 shadow-[0_4px_9px_-4px_#0000000d]

          dark:bg-primary-900 dark:shadow-[0_4px_9px_-4px_#0000000d]

          lg:justify-between

          md:p-8
        "
      >
        <div
          class="
            relative grid w-full gap-4

            md:gap-8
          "
        >
          <div class="grid gap-4">
            <div class="sr-only">
              <label for="email">{{
                t('form.email.label')
              }}</label>
              <input
                id="email"
                autocomplete="username email"
                name="email"
                style="display: none"
                type="text"
                value="..."
              >
            </div>

            <div class="grid content-evenly items-start gap-1">
              <label
                class="
                  text-primary-950 mb-2

                  dark:text-primary-50
                "
                for="newPassword1"
              >{{
                t('form.newPassword1.label')
              }}</label>
              <FormTextInput
                id="newPassword1"
                v-model="newPassword1"
                :bind="newPassword1Props"
                :required="true"
                autocomplete="new-password"
                name="newPassword1"
                type="password"
              />
              <span
                v-if="errors.newPassword1 && meta.touched"
                class="relative px-4 py-3 text-xs text-red-600"
              >{{ errors.newPassword1 }}</span>
            </div>

            <div class="grid content-evenly items-start gap-1">
              <label
                class="
                  text-primary-950 mb-2

                  dark:text-primary-50
                "
                for="newPassword2"
              >{{
                t('form.newPassword2.label')
              }}</label>
              <FormTextInput
                id="newPassword2"
                v-model="newPassword2"
                :bind="newPassword2Props"
                :required="true"
                autocomplete="new-password"
                name="newPassword2"
                type="password"
              />
              <span
                v-if="errors.newPassword2"
                class="relative px-4 py-3 text-xs text-red-600"
              >{{ errors.newPassword2 }}</span>
            </div>
          </div>
          <UButton
            :aria-busy="isSubmitting"
            :disabled="isSubmitting"
            :label="t('form.submit')"
            :trailing="true"
            class="ml-0 justify-center"
            color="primary"
            size="xl"
            type="submit"
            variant="soft"
          />
        </div>
      </div>
    </form>
  </section>
</template>

<i18n lang="yaml">
el:
  form:
    email:
      label: Email
    newPassword1:
      label: Κωδικός πρόσβασης
    newPassword2:
      label: Επιβεβαίωση κωδικού πρόσβασης
      errors:
        match: Η επιβεβαίωση κωδικού πρόσβασης πρέπει να ταιριάζει με τον
          κωδικό πρόσβασης
    submit: Επαναφέρετε τον κωδικό πρόσβασης
</i18n>
