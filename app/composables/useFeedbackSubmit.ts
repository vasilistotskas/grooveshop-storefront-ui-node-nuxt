import * as z from 'zod'

/** What a piece of feedback can be about. */
export const FEEDBACK_CATEGORIES = [
  'general',
  'website',
  'products',
  'delivery',
  'support',
  'other',
] as const

/**
 * Sending feedback, apart from its drawing (`FeedbackForm` and the
 * tenants' own): the rules of the five fields and the send.
 *
 * `schema` mirrors Django's `FeedbackWriteSerializer` and
 * `validate_feedback_content` so the visitor gets inline hints instead of
 * an opaque 400: the rating is required (undefined is "required"), the
 * email is optional and accepts an empty string (anonymous feedback), a
 * name, when given, has two characters, and the message needs ten and five
 * words, like the contact spam filter (`contact/utils.py`,
 * `validate_feedback_content`, `detect_spam_patterns`). Name and message
 * are measured trimmed, as DRF trims them before Django counts them.
 *
 * `send(input)` checks the input against the schema, posts it, toasts
 * `t('success.title')` and resolves `true`; one at a time (`loading`). A
 * refusal (the proxy forwards Django's 4xx validation body: the spam
 * filter, a disposable email, ...) is one toast with Django's reason
 * behind `t('error.default')`, and resolves `false`.
 */
export function useFeedbackSubmit(options: { t: ReturnType<typeof useI18n>['t'] }) {
  const { t } = options
  const toast = useToast()
  const { notify } = useApiError()

  const loading = ref(false)

  const schema = z.object({
    rating: z.number({
      error: () => t('validation.required'),
    })
      .int({ error: () => t('validation.required') })
      .min(1, { error: t('validation.required') })
      .max(5, { error: t('validation.max_value', { max: 5 }) }),

    category: z.enum(FEEDBACK_CATEGORIES),

    message: z.string({
      error: issue => issue.input === undefined
        ? t('validation.required')
        : t('validation.string.invalid'),
    })
      .trim()
      .min(10, { error: t('validation.min', { min: 10 }) })
      .max(5000, { error: t('validation.max', { max: 5000 }) })
      .refine(
        value => value.trim().split(/\s+/).filter(Boolean).length >= 5,
        { error: t('validation.message.min_words', { min: 5 }) },
      ),

    name: z.string()
      .trim()
      .refine(value => value === '' || value.length >= 2, { error: t('validation.min', { min: 2 }) })
      .max(100, { error: t('validation.max', { max: 100 }) })
      .optional(),

    email: z.union([
      z.email({ error: t('validation.email.valid') }).max(254),
      z.literal(''),
    ]).optional(),
  })

  async function send(input: unknown): Promise<boolean> {
    if (loading.value) return false
    loading.value = true
    try {
      await $api('/api/feedback', {
        method: 'POST',
        body: schema.parse(input),
      })

      toast.add({
        title: t('success.title'),
        description: t('success.description'),
        color: 'success',
      })
      return true
    }
    catch (error) {
      notify('FeedbackForm:send', error, { title: t('error.default') })
      return false
    }
    finally {
      loading.value = false
    }
  }

  return { schema, loading, send }
}
