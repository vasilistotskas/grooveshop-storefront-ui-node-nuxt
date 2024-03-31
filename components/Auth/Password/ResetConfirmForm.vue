<script lang="ts" setup>
import { z } from 'zod'

const { passwordResetConfirm } = useAuth()

const { t } = useI18n()
const route = useRoute('auth-password-reset-confirm-uid-token___en')
const uid = route.params.uid
const token = route.params.token

const ZodPasswordResetConfirm = z
  .object({
    newPassword1: z.string().min(8).max(255),
    newPassword2: z.string().min(8).max(255),
    uid: z.string(),
    token: z.string(),
  })
  .refine((data) => data.newPassword1 === data.newPassword2, {
    message: t(
      'pages.auth.password.reset.confirm.form.newPassword2.errors.match',
    ),
    path: ['newPassword2'],
  })

const initialValues = {
  newPassword1: '',
  newPassword2: '',
  uid,
  token,
}

const validationSchema = toTypedSchema(ZodPasswordResetConfirm)

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
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
  await passwordResetConfirm({
    newPassword1: values.newPassword1,
    newPassword2: values.newPassword2,
    uid: values.uid,
    token: values.token,
  })
})
</script>

<template>
  <section class="grid">
    <form
      id="passwordResetConfirmForm"
      ref="passwordResetConfirmForm"
      class="container-2xs p-0 md:px-20"
      name="passwordResetConfirmForm"
      @submit="onSubmit"
    >
      <div
        class="flex h-full flex-wrap items-center justify-center rounded-[0.5rem] border border-gray-900/10 bg-white p-4 shadow-[0_4px_9px_-4px_#0000000d] dark:border-gray-50/[0.2] dark:bg-zinc-900 dark:shadow-[0_4px_9px_-4px_#0000000d] md:p-8 lg:justify-between"
      >
        <div class="relative grid w-full">
          <div class="sr-only">
            <label for="email">{{
              $t('pages.auth.password.reset.confirm.form.email.label')
            }}</label>
            <input
              id="email"
              type="text"
              name="email"
              value="..."
              autocomplete="username email"
              style="display: none"
            >
          </div>

          <div class="grid content-evenly items-start">
            <label
              class="text-primary-800 dark:text-primary-100 mb-2"
              for="newPassword1"
              >{{
                $t('pages.auth.password.reset.confirm.form.newPassword1.label')
              }}</label
            >
            <FormTextInput
              id="newPassword1"
              v-model="newPassword1"
              :bind="newPassword1Props"
              class="text-primary-800 dark:text-primary-100 mb-2"
              name="newPassword1"
              type="password"
              autocomplete="new-password"
              :required="true"
            />
            <span
              v-if="errors.newPassword1"
              class="relative px-4 py-3 text-sm text-red-600"
              >{{ errors.newPassword1 }}</span
            >
          </div>

          <div class="grid content-evenly items-start">
            <label
              class="text-primary-800 dark:text-primary-100 mb-2"
              for="newPassword2"
              >{{
                $t('pages.auth.password.reset.confirm.form.newPassword2.label')
              }}</label
            >
            <FormTextInput
              id="newPassword2"
              v-model="newPassword2"
              :bind="newPassword2Props"
              class="text-primary-800 dark:text-primary-100 mb-2"
              name="newPassword2"
              type="password"
              autocomplete="new-password"
              :required="true"
            />
            <span
              v-if="errors.newPassword2"
              class="relative px-4 py-3 text-sm text-red-600"
              >{{ errors.newPassword2 }}</span
            >
          </div>

          <button
            type="submit"
            class="bg-primary hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-700 inline-block w-full rounded px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
          >
            {{ $t('pages.auth.password.reset.confirm.form.submit') }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
