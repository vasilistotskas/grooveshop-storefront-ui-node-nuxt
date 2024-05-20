<script lang="ts" setup>
import { z } from 'zod'

const { passwordResetConfirm } = useAuth()

const { t } = useI18n()
const route = useRoute()
const uid = route.params.uid
const token = route.params.token

const ZodPasswordResetConfirm = z
  .object({
    newPassword1: z.string({ required_error: t('common.validation.required') }).min(8).max(255),
    newPassword2: z.string({ required_error: t('common.validation.required') }).min(8).max(255),
    uid: z.string({ required_error: t('common.validation.required') }),
    token: z.string({ required_error: t('common.validation.required') }),
  })
  .refine(data => data.newPassword1 === data.newPassword2, {
    message: t(
      'pages.account.password.reset.confirm.form.newPassword2.errors.match',
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
        <div class="relative grid w-full">
          <div class="sr-only">
            <label for="email">{{
              $t('pages.account.password.reset.confirm.form.email.label')
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

          <div class="grid content-evenly items-start gap-1">
            <label
              class="
                text-primary-950 mb-2

                dark:text-primary-50
              "
              for="newPassword1"
            >{{
              $t('pages.account.password.reset.confirm.form.newPassword1.label')
            }}</label>
            <FormTextInput
              id="newPassword1"
              v-model="newPassword1"
              :bind="newPassword1Props"
              name="newPassword1"
              type="password"
              autocomplete="new-password"
              :required="true"
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
              $t('pages.account.password.reset.confirm.form.newPassword2.label')
            }}</label>
            <FormTextInput
              id="newPassword2"
              v-model="newPassword2"
              :bind="newPassword2Props"
              name="newPassword2"
              type="password"
              autocomplete="new-password"
              :required="true"
            />
            <span
              v-if="errors.newPassword2"
              class="relative px-4 py-3 text-xs text-red-600"
            >{{ errors.newPassword2 }}</span>
          </div>

          <UButton
            type="submit"
            size="sm"
            color="primary"
            variant="solid"
            :label="$t('pages.account.password.reset.confirm.form.submit')"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
            block
          />
        </div>
      </div>
    </form>
  </section>
</template>
