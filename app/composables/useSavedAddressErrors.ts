import type { FormError, FormErrorEvent, FormErrorWithId } from '@nuxt/ui'

interface SavedAddressForm {
  validate: (opts: { name?: string[], silent?: boolean }) => Promise<unknown>
  setErrors: (errors: FormError[]) => void
  getErrors: () => FormErrorWithId[]
}

/**
 * Checkout step 1's errors on the fields a picked saved address stands for.
 *
 * An error on a field the ``saved`` mode does not render has nowhere to
 * show: Nuxt UI resolves each error to its input, so a missing input
 * leaves a validation error without an id and drops a ``setErrors`` one.
 * «Continue» then did nothing on screen (demo, 2026-10-16). The step
 * opens the picked address's fields first (``openFields`` is its
 * ``edit-address`` event), so every error lands under its input. Shared
 * by the default step and the frozen webside one.
 */
export function useSavedAddressErrors(options: {
  form: Readonly<Ref<SavedAddressForm | null>>
  isSavedMode: Readonly<Ref<boolean>>
  openFields: () => void
}) {
  const { form, isSavedMode, openFields } = options

  async function openFieldsFor(errors: FormError[]): Promise<boolean> {
    if (!isSavedMode.value) return false
    if (!errors.some(error => error.name && SAVED_ADDRESS_FIELDS.includes(error.name))) return false
    openFields()
    await nextTick()
    return true
  }

  async function onFormError(event: FormErrorEvent) {
    if (await openFieldsFor(event.errors)) {
      // The same errors again, resolved against the inputs now on screen.
      await form.value?.validate({ silent: true })
      scrollToFirstFormError({ errors: form.value?.getErrors() ?? [] })
      return
    }
    scrollToFirstFormError(event)
  }

  async function showServerErrors(errors: FormError[] | undefined) {
    if (!errors?.length) return
    await openFieldsFor(errors)
    form.value?.setErrors(errors)
  }

  return { onFormError, showServerErrors }
}
