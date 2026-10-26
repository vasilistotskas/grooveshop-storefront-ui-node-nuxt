import * as z from 'zod'

/**
 * Change the password, or set one on an account that signs in without
 * (social sign-in, a passkey, a code): the current password is asked
 * only when there is one (`hasCurrentPassword`). Shared by every drawing
 * of the form (`Account/Password/ChangeForm` and the tenants' own).
 *
 * The schema mirrors what Django enforces where a pure function can (8+
 * characters, not all digits); its other refusals arrive as allauth's
 * translated error codes, through `handleAllAuthClientError`. The strength
 * rubric is advisory (`passwordStrength`) and never gates.
 *
 * `submit` reports whether the password was saved, after toasting it:
 * where the shopper goes next is the form's own (each drawing has its own
 * account pages). `fieldLabels` name the two fields in the "must match"
 * message, in the drawing's own words; `successIcon` is the success
 * toast's, for the drawing that dresses its toasts.
 */
export function usePasswordChange(options: {
  fieldLabels: () => { field: string, other: string }
  successIcon?: string
}) {
  const { changePassword } = useAllAuthAccount()
  const { hasCurrentPassword } = storeToRefs(useAuthStore())
  const toast = useToast()
  const { t } = useNuxtApp().$i18n

  const isSubmitting = ref(false)

  const state = reactive({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const schema = computed(() => z
    .object({
      current_password: hasCurrentPassword.value
        ? z.string().min(1, t('validation.required'))
        : z.string().optional(),
      new_password: z.string()
        .min(8, t('validation.min', { min: 8 }))
        .max(255, t('validation.max', { max: 255 }))
        .refine(value => !/^\d+$/.test(value), {
          error: t('validation.password.entirely_numeric'),
        }),
      confirm_password: z.string().min(1, t('validation.required')),
    })
    .superRefine((value, ctx) => {
      if (value.new_password !== value.confirm_password) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.must_match', options.fieldLabels()),
          path: ['confirm_password'],
        })
      }
      if (hasCurrentPassword.value && value.current_password && value.current_password === value.new_password) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.password.must_not_be_same'),
          path: ['new_password'],
        })
      }
    }))

  async function submit(): Promise<boolean> {
    if (isSubmitting.value) return false
    isSubmitting.value = true
    try {
      await changePassword({
        current_password: state.current_password,
        new_password: state.new_password,
      })
      toast.add({ title: t('auth.password.change.success'), color: 'success', icon: options.successIcon })
      return true
    }
    catch (error) {
      handleAllAuthClientError(error)
      return false
    }
    finally {
      isSubmitting.value = false
    }
  }

  return { state, schema, hasCurrentPassword, isSubmitting, submit }
}
