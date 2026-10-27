import type * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * The shopper's wholesale (B2B) profile, apart from its drawing
 * (`Storefront/Account/Business` and the tenants' own): the profile as
 * Django holds it, the company-details form over it, and the save.
 *
 * A shopper with no profile yet gets a 404 (`absent`): the form starts
 * blank. The schema is the generated contract, tightened with the
 * client-side ΑΦΜ checksum (mirror of Django's `b2b/validators.py`) so the
 * shopper gets an inline error instead of a 400 round trip. `reset` puts the
 * saved details back in the form. A failed save
 * puts Django's field errors under their inputs (`form` is the `UForm`
 * ref) and says the rest in a toast. Call it where `await` is allowed:
 * the profile is read before it returns.
 */
export async function useBusinessProfile(options: {
  t: ReturnType<typeof useI18n>['t']
  form: Readonly<Ref<ApiErrorForm | null>>
}) {
  const { t } = options
  const toast = useToast()
  const { reportFailure } = useApiFormErrors(options.form, { fields: () => Object.keys(schema.shape) })

  const schema = zBusinessProfileWriteRequest.extend({
    vatId: zBusinessProfileWriteRequest.shape.vatId.refine(isValidGreekAfm, {
      error: t('validation.billing_vat.checksum'),
    }),
  })
  type Schema = z.output<typeof schema>

  const { data: profile, error, refresh } = await useApi('/api/b2b/profile', {
    key: 'account:b2b-profile',
    headers: useRequestHeaders(),
  })

  const absent = computed(() => error.value?.statusCode === 404)

  const state = reactive<Partial<Schema>>({})

  function reset() {
    const saved = profile.value
    state.companyName = saved?.companyName
    state.vatId = saved?.vatId
    state.taxOffice = saved?.taxOffice
    state.activity = saved?.activity
    state.billingStreet = saved?.billingStreet || undefined
    state.billingStreetNumber = saved?.billingStreetNumber || undefined
    state.billingCity = saved?.billingCity || undefined
    state.billingZipcode = saved?.billingZipcode || undefined
  }

  watch(profile, reset, { immediate: true })

  const isSubmitting = ref(false)

  async function save(event: FormSubmitEvent<Schema>) {
    if (isSubmitting.value) return
    isSubmitting.value = true
    try {
      await $api('/api/b2b/profile', {
        method: 'PUT',
        headers: useRequestHeaders(),
        body: event.data,
      })
      toast.add({ title: t('submit.success'), color: 'success' })
      await refresh()
    }
    catch (error) {
      await reportFailure('business:update', error, { title: t('submit.error') })
    }
    finally {
      isSubmitting.value = false
    }
  }

  return { schema, state, profile, error, absent, refresh, isSubmitting, save, reset }
}
