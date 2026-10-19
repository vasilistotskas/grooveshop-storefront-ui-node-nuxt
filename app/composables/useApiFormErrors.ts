import type { FormError, FormErrorWithId } from '@nuxt/ui'

/** A form's `UForm` ref, as far as server errors need it. */
export interface ApiErrorForm {
  setErrors: (errors: FormError[]) => void
  getErrors?: () => FormErrorWithId[]
}

/**
 * The field errors of a described failure as `UForm` errors, one per
 * message, on the path the server named.
 */
export function formErrorsOf(described: Pick<DescribedApiError, 'fieldErrors'>): FormError[] {
  return described.fieldErrors.map(({ name, message }) => ({ name, message }))
}

/**
 * Put a failed submit's field errors under their inputs, and say the rest
 * in a toast: the generic mapper behind every form (`useSavedAddressErrors`
 * adds checkout's hidden-field handling on top of `formErrorsOf`).
 *
 * `fields` names the inputs the form has. A server error on a field the
 * form does not render has nowhere to show (Nuxt UI drops it), so it goes
 * to the toast instead of vanishing:
 *
 * - errors on the form's own fields land under their inputs, the first is
 *   scrolled to;
 * - anything else (a refusal of the whole action, an error on a field the
 *   form lacks, a 5xx, no answer): a toast under the action's id with the
 *   server's reason.
 *
 * ```ts
 * const form = useTemplateRef('form')
 * const { reportFailure } = useApiFormErrors(form, { fields: () => Object.keys(state) })
 * catch (error) { await reportFailure('address:update', error, { title: t('error') }) }
 * ```
 */
export function useApiFormErrors(
  form: Readonly<Ref<ApiErrorForm | null>>,
  options: { fields: () => readonly string[] },
) {
  const { notify } = useApiError()

  async function reportFailure(id: string, error: unknown, notifyOptions: DescribeApiErrorOptions = {}): Promise<DescribedApiError> {
    const described = describeApiError(error)
    const known = new Set(options.fields())
    const inline = described.fieldErrors.filter(entry => known.has(entry.name))
    const elsewhere = described.fieldErrors.length > inline.length
    if (inline.length && form.value) {
      form.value.setErrors(formErrorsOf({ fieldErrors: inline }))
      await nextTick()
      scrollToFirstFormError({ errors: form.value.getErrors?.() ?? [] })
    }
    if (!inline.length || !form.value || elsewhere) notify(id, error, notifyOptions)
    return described
  }

  return { reportFailure }
}
