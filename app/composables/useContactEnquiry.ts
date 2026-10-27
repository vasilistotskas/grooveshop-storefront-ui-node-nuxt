import { z } from 'zod'

/**
 * The contact enquiry, apart from its drawing (`ContactForm` and the
 * tenants' own): the rules of the three fields every drawing asks for, and
 * the send.
 *
 * `fields` mirrors what Django enforces so the visitor gets an inline hint
 * instead of an opaque 400 (`ContactWriteSerializer`, `contact/serializers.py`):
 * the name and the message are measured trimmed, as DRF trims them before
 * `validate_name` / `validate_message` count them, and the message needs
 * five words, because Django's contact spam filter rejects anything
 * shorter (`contact/utils.py`, `detect_spam_patterns`). A drawing with more questions extends it
 * (`fields.extend({ ... })`).
 *
 * `send(body)` posts the enquiry, toasts `t('success.title')` and resolves
 * `true`; one at a time (`isSubmitting`). A refusal is one toast with
 * Django's reason (the spam filter, a disposable email, ...) behind
 * `t('error.default')`, and resolves `false`.
 */
export function useContactEnquiry(options: { t: ReturnType<typeof useI18n>['t'] }) {
  const { t } = options
  const toast = useToast()
  const { notify } = useApiError()

  const isSubmitting = ref(false)

  const fields = z.object({
    name: z.string({
      error: issue => issue.input === undefined
        ? t('validation.required')
        : t('validation.string.invalid'),
    }).trim()
      .min(2, { error: t('validation.string.invalid') })
      .max(100, { error: t('validation.max', { max: 100 }) }),

    email: z.email({
      error: issue => issue.input === undefined
        ? t('validation.required')
        : t('validation.email.valid'),
    }).max(254, { error: t('validation.max', { max: 254 }) }),

    message: z.string({
      error: issue => issue.input === undefined
        ? t('validation.required')
        : t('validation.string.invalid'),
    }).trim()
      .min(10, { error: t('validation.min', { min: 10 }) })
      .max(5000, { error: t('validation.max', { max: 5000 }) })
      .refine(
        value => value.trim().split(/\s+/).filter(Boolean).length >= 5,
        { error: t('validation.message.min_words', { min: 5 }) },
      ),
  })

  async function send(body: ContactWriteRequestWritable): Promise<boolean> {
    if (isSubmitting.value) return false
    isSubmitting.value = true
    try {
      await $api('/api/contact', {
        method: 'POST',
        body,
      })

      toast.add({
        title: t('success.title'),
        color: 'success',
      })
      return true
    }
    catch (error) {
      notify('ContactForm:send', error, { title: t('error.default') })
      return false
    }
    finally {
      isSubmitting.value = false
    }
  }

  return { fields, isSubmitting, send }
}
