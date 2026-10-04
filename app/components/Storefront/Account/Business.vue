<script lang="ts" setup>
import type * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

/**
 * The shopper's wholesale (B2B) profile, as the boards draw it: where the
 * application stands, then the company details in one card. A shopper
 * with no profile yet (the API answers 404) sees the form blank and an
 * invitation to apply; any other failure says so instead.
 *
 * The VAT number shows its EU VIES check while it is the number that was
 * checked. A suspended profile is a merchant decision that self-service
 * edits cannot lift, so it gets no form. Billing country and an accounts
 * email are not part of the profile (PLAN B43).
 */
const { t, locale } = useI18n()
useHead({ title: () => t('title') })
const toast = useToast()

// The generated contract schema, tightened with the client-side ΑΦΜ
// checksum (mirror of Django's b2b/validators.py) so the shopper gets an
// inline error instead of a 400 round trip.
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

function fillFromProfile() {
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

watch(profile, fillFromProfile, { immediate: true })

const STATUS_TINT = {
  APPROVED: { color: 'success', icon: 'i-lucide-circle-check' },
  PENDING: { color: 'warning', icon: 'i-lucide-clock' },
  REJECTED: { color: 'error', icon: 'i-lucide-circle-x' },
  SUSPENDED: { color: 'error', icon: 'i-lucide-ban' },
} as const

const statusTitle = computed(() => {
  const saved = profile.value
  if (!saved) return ''
  if (saved.status === 'APPROVED' && saved.customerGroupName) {
    return t('status.APPROVED.title_group', { group: saved.customerGroupName })
  }
  return t(`status.${saved.status}.title`)
})

const statusDescription = computed(() => {
  const saved = profile.value
  if (!saved) return ''
  if (saved.status === 'REJECTED' && saved.rejectionReason) return saved.rejectionReason
  return t(`status.${saved.status}.description`)
})

/** The VIES check, only while the field still holds the number checked. */
const vies = computed(() => {
  const saved = profile.value
  if (!saved?.viesCheckedAt || state.vatId !== saved.vatId || saved.viesStatus === 'UNCHECKED') return null
  return { status: saved.viesStatus, checkedAt: saved.viesCheckedAt }
})

const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
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
  catch {
    toast.add({ title: t('submit.error'), color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader
      :title="t('title')"
      :lead="t('lead')"
    />

    <AccountLoadError
      v-if="error && !absent"
      :message="t('load_error')"
      @retry="() => refresh()"
    />

    <template v-else>
      <UAlert
        v-if="profile"
        :title="statusTitle"
        :description="statusDescription"
        :icon="STATUS_TINT[profile.status].icon"
        :color="STATUS_TINT[profile.status].color"
        variant="soft"
      />
      <UAlert
        v-else
        :title="t('intro.title')"
        :description="t('intro.description')"
        icon="i-lucide-building-2"
        color="neutral"
        variant="soft"
      />

      <UForm
        v-if="profile?.status !== 'SUSPENDED'"
        :schema="schema"
        :state="state"
        class="
          grid gap-x-4 gap-y-5 rounded-[1.25rem] bg-default p-5 ring ring-default
          sm:grid-cols-2 sm:p-6
        "
        @error="scrollToFirstFormError"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('form.company_name')"
          name="companyName"
          required
        >
          <UInput
            v-model="state.companyName"
            autocomplete="organization"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('form.activity')"
          :help="t('form.activity_help')"
          name="activity"
          required
        >
          <UInput
            v-model="state.activity"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('form.vat_id')"
          :help="vies ? undefined : t('form.vat_help')"
          name="vatId"
          required
        >
          <UInput
            v-model="state.vatId"
            :leading-icon="vies?.status === 'VALID' ? 'i-lucide-check' : undefined"
            inputmode="numeric"
            maxlength="12"
            class="w-full"
          />
          <template
            v-if="vies"
            #help
          >
            <i18n-t :keypath="`vies.${vies.status}`">
              <template #date>
                <NuxtTime
                  :datetime="vies.checkedAt"
                  :locale="locale"
                  day="numeric"
                  month="short"
                  year="numeric"
                />
              </template>
            </i18n-t>
          </template>
        </UFormField>

        <UFormField
          :label="t('form.tax_office')"
          name="taxOffice"
          required
        >
          <UInput
            v-model="state.taxOffice"
            :placeholder="t('form.tax_office_placeholder')"
            class="w-full"
          />
        </UFormField>

        <p class="text-xs font-semibold tracking-[0.06em] text-toned uppercase sm:col-span-2">
          {{ t('form.billing_address') }}
        </p>

        <UFormField
          :label="t('form.billing_street')"
          name="billingStreet"
        >
          <UInput
            v-model="state.billingStreet"
            autocomplete="address-line1"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('form.billing_street_number')"
          name="billingStreetNumber"
        >
          <UInput
            v-model="state.billingStreetNumber"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('form.billing_city')"
          name="billingCity"
        >
          <UInput
            v-model="state.billingCity"
            autocomplete="address-level2"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('form.billing_zipcode')"
          name="billingZipcode"
        >
          <UInput
            v-model="state.billingZipcode"
            autocomplete="postal-code"
            inputmode="numeric"
            class="w-full"
          />
        </UFormField>

        <div class="flex flex-wrap items-center gap-2 sm:col-span-2">
          <UButton
            :label="profile ? t('form.update') : t('form.submit')"
            :loading="isSubmitting"
            type="submit"
            color="neutral"
          />
          <UButton
            v-if="profile"
            :label="t('form.cancel')"
            :disabled="isSubmitting"
            color="neutral"
            variant="ghost"
            @click="fillFromProfile"
          />
        </div>
      </UForm>
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Λογαριασμός χονδρικής
  lead: Οι επαγγελματίες πελάτες αγοράζουν στις τιμές της ομάδας τους.
  load_error: Δεν μπορέσαμε να φορτώσουμε τα στοιχεία της επιχείρησής σου.
  intro:
    title: Γίνε πελάτης χονδρικής
    description: Συμπλήρωσε τα στοιχεία της επιχείρησής σου. Μόλις τα εγκρίνει το κατάστημα, οι τιμές χονδρικής ισχύουν αυτόματα όσο είσαι συνδεδεμένος.
  status:
    PENDING:
      title: Η αίτησή σου εξετάζεται
      description: Θα σου στείλουμε email μόλις το κατάστημα ολοκληρώσει τον έλεγχο.
    APPROVED:
      title: Εγκεκριμένος
      title_group: Εγκεκριμένος · {group}
      description: Οι τιμές σε όλο το κατάστημα περιλαμβάνουν ήδη την έκπτωση της ομάδας σου. Αν αλλάξεις τα στοιχεία της εταιρείας, η αίτηση ελέγχεται ξανά και μέχρι τότε ισχύουν οι τιμές λιανικής.
    REJECTED:
      title: Η αίτησή σου δεν εγκρίθηκε
      description: Μπορείς να διορθώσεις τα στοιχεία και να την υποβάλεις ξανά.
    SUSPENDED:
      title: Ο λογαριασμός χονδρικής σου έχει ανασταλεί
      description: Επικοινώνησε με το κατάστημα για περισσότερες πληροφορίες.
  vies:
    VALID: Έγκυρος · ελέγχθηκε στο VIES στις {date}
    INVALID: Δεν βρέθηκε στο VIES στον έλεγχο της {date}
    UNAVAILABLE: Το VIES δεν απάντησε στον έλεγχο της {date}
  submit:
    success: Τα στοιχεία της επιχείρησης αποθηκεύτηκαν
    error: Τα στοιχεία δεν αποθηκεύτηκαν. Δοκίμασε ξανά.
  form:
    company_name: Επωνυμία εταιρείας
    activity: Δραστηριότητα
    activity_help: Όπως εμφανίζεται στο μητρώο.
    vat_id: ΑΦΜ
    vat_help: 9 ψηφία χωρίς πρόθεμα EL/GR.
    tax_office: ΔΟΥ
    tax_office_placeholder: π.χ. Α' Αθηνών
    billing_address: Διεύθυνση έδρας (προαιρετική)
    billing_street: Οδός
    billing_street_number: Αριθμός
    billing_city: Πόλη
    billing_zipcode: Τ.Κ.
    submit: Υποβολή αίτησης
    update: Αποθήκευση αλλαγών
    cancel: Άκυρο
en:
  title: Wholesale account
  lead: Business customers buy at their group's prices.
  load_error: We could not load your company details.
  intro:
    title: Become a wholesale customer
    description: Fill in your company details. Once the store approves them, your wholesale prices apply automatically whenever you are signed in.
  status:
    PENDING:
      title: Your application is being reviewed
      description: We will email you as soon as the store has finished checking it.
    APPROVED:
      title: Approved
      title_group: Approved · {group}
      description: Your prices across the shop already include your group discount. Changing your company details sends the profile back for review, and retail prices apply until then.
    REJECTED:
      title: Your application was not approved
      description: You can correct the details and submit it again.
    SUSPENDED:
      title: Your wholesale account is suspended
      description: Get in touch with the store for more information.
  vies:
    VALID: Valid · checked against VIES on {date}
    INVALID: Not found in VIES when checked on {date}
    UNAVAILABLE: VIES did not answer when checked on {date}
  submit:
    success: Your company details were saved
    error: The details were not saved. Please try again.
  form:
    company_name: Company name
    activity: Business activity
    activity_help: As it appears on the register.
    vat_id: VAT number (ΑΦΜ)
    vat_help: Nine digits, without the EL/GR prefix.
    tax_office: Tax office (ΔΟΥ)
    tax_office_placeholder: e.g. Athens A
    billing_address: Registered address (optional)
    billing_street: Street
    billing_street_number: Number
    billing_city: City
    billing_zipcode: Postcode
    submit: Submit application
    update: Save changes
    cancel: Cancel
</i18n>
