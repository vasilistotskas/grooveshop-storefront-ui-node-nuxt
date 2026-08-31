<script lang="ts" setup>
import type * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

definePageMeta({
  middleware: ['b2b-enabled'],
})

const { t } = useI18n()
const toast = useToast()

const isSubmitting = ref(false)

// Auto-generated contract schema, tightened with the client-side ΑΦΜ
// checksum (mirror of Django's b2b/validators.py) so the user gets an
// inline error instead of a 400 round-trip.
const schema = zBusinessProfileWriteRequest.extend({
  vatId: zBusinessProfileWriteRequest.shape.vatId.refine(isValidGreekAfm, {
    error: t('validation.billing_vat.checksum'),
  }),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  companyName: undefined,
  vatId: undefined,
  taxOffice: undefined,
  activity: undefined,
  billingStreet: undefined,
  billingStreetNumber: undefined,
  billingCity: undefined,
  billingZipcode: undefined,
})

// 404 = no profile yet — the form starts blank and the banner hides.
const { data: profile, refresh } = await useFetch('/api/b2b/profile', {
  key: 'account:b2b-profile',
  headers: useRequestHeaders(),
})

watch(profile, (value) => {
  if (!value) return
  state.companyName = value.companyName
  state.vatId = value.vatId
  state.taxOffice = value.taxOffice
  state.activity = value.activity
  state.billingStreet = value.billingStreet || undefined
  state.billingStreetNumber = value.billingStreetNumber || undefined
  state.billingCity = value.billingCity || undefined
  state.billingZipcode = value.billingZipcode || undefined
}, { immediate: true })

const statusColor = computed(() => {
  switch (profile.value?.status) {
    case 'APPROVED':
      return 'success' as const
    case 'PENDING':
      return 'warning' as const
    default:
      return 'error' as const
  }
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    await $fetch('/api/b2b/profile', {
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

defineRouteRules({
  robots: false,
})
</script>

<template>
  <PageWrapper class="flex flex-col gap-4 md:mt-1 md:gap-8 md:p-0!">
    <PageTitle class="text-center md:mt-0">
      {{ t('title') }}
    </PageTitle>

    <UAlert
      v-if="profile"
      :color="statusColor"
      variant="subtle"
      :title="t(`status.${profile.status}.title`)"
      :description="profile.status === 'REJECTED' && profile.rejectionReason
        ? profile.rejectionReason
        : t(`status.${profile.status}.description`)"
      :icon="profile.status === 'APPROVED'
        ? 'i-heroicons-check-badge'
        : 'i-heroicons-clock'"
    >
      <template v-if="profile.status === 'APPROVED' && profile.customerGroupName" #description>
        {{ t('status.APPROVED.group', { group: profile.customerGroupName }) }}
      </template>
    </UAlert>
    <UAlert
      v-else
      color="info"
      variant="subtle"
      :title="t('intro.title')"
      :description="t('intro.description')"
      icon="i-heroicons-briefcase"
    />

    <!-- SUSPENDED is a merchant decision — self-service edits can't
         lift it (the backend keeps the status), so offering the form
         would only mislead. The alert above says to contact the store. -->
    <UCard v-if="profile?.status !== 'SUSPENDED'">
      <UForm
        :schema="schema"
        :state="state"
        class="grid gap-4 md:grid-cols-2"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('form.company_name')"
          name="companyName"
          required
          class="md:col-span-2"
        >
          <UInput
            v-model="state.companyName"
            :placeholder="t('form.company_name')"
            autocomplete="organization"
          />
        </UFormField>

        <UFormField :label="t('form.vat_id')" :help="t('form.vat_help')" name="vatId" required>
          <UInput
            v-model="state.vatId"
            placeholder="123456789"
            inputmode="numeric"
            maxlength="12"
          />
        </UFormField>

        <UFormField :label="t('form.tax_office')" name="taxOffice" required>
          <UInput
            v-model="state.taxOffice"
            :placeholder="t('form.tax_office_placeholder')"
          />
        </UFormField>

        <UFormField
          :label="t('form.activity')"
          :help="t('form.activity_help')"
          name="activity"
          required
          class="md:col-span-2"
        >
          <UInput v-model="state.activity" :placeholder="t('form.activity')" />
        </UFormField>

        <USeparator class="md:col-span-2" :label="t('form.billing_address')" />

        <UFormField :label="t('form.billing_street')" name="billingStreet">
          <UInput v-model="state.billingStreet" autocomplete="address-line1" />
        </UFormField>

        <UFormField :label="t('form.billing_street_number')" name="billingStreetNumber">
          <UInput v-model="state.billingStreetNumber" inputmode="numeric" />
        </UFormField>

        <UFormField :label="t('form.billing_city')" name="billingCity">
          <UInput v-model="state.billingCity" autocomplete="address-level2" />
        </UFormField>

        <UFormField :label="t('form.billing_zipcode')" name="billingZipcode">
          <UInput v-model="state.billingZipcode" autocomplete="postal-code" inputmode="numeric" />
        </UFormField>

        <div class="md:col-span-2">
          <UAlert
            v-if="profile?.status === 'APPROVED'"
            color="warning"
            variant="subtle"
            :description="t('form.reapproval_notice')"
            class="mb-4"
          />
          <UButton
            type="submit"
            color="success"
            block
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            {{ profile ? t('form.update') : t('form.submit') }}
          </UButton>
        </div>
      </UForm>
    </UCard>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Εταιρικός λογαριασμός
  intro:
    title: Γίνε πελάτης χονδρικής
    description: Συμπλήρωσε τα στοιχεία της επιχείρησής σου. Μετά την έγκριση από το κατάστημα, οι τιμές χονδρικής σου εφαρμόζονται αυτόματα όσο είσαι συνδεδεμένος.
  status:
    PENDING:
      title: Η αίτησή σου εξετάζεται
      description: Θα ενημερωθείς με email μόλις ολοκληρωθεί ο έλεγχος από το κατάστημα.
    APPROVED:
      title: Ο εταιρικός λογαριασμός σου είναι ενεργός
      description: Οι τιμές χονδρικής εφαρμόζονται αυτόματα στο καλάθι και στις παραγγελίες σου.
      group: "Τιμοκατάλογος: {group}"
    REJECTED:
      title: Η αίτησή σου δεν εγκρίθηκε
      description: Μπορείς να διορθώσεις τα στοιχεία και να υποβάλεις ξανά.
    SUSPENDED:
      title: Ο εταιρικός λογαριασμός σου έχει ανασταλεί
      description: Επικοινώνησε με το κατάστημα για περισσότερες πληροφορίες.
  submit:
    success: Τα στοιχεία της επιχείρησης αποθηκεύτηκαν
    error: Σφάλμα κατά την αποθήκευση των στοιχείων
  form:
    company_name: Επωνυμία εταιρείας
    vat_id: ΑΦΜ
    vat_help: 9 ψηφία χωρίς πρόθεμα EL/GR.
    tax_office: ΔΟΥ
    tax_office_placeholder: π.χ. Α' Αθηνών
    activity: Δραστηριότητα
    activity_help: Η επαγγελματική δραστηριότητα όπως εμφανίζεται στο μητρώο.
    billing_address: Διεύθυνση έδρας (προαιρετική)
    billing_street: Οδός
    billing_street_number: Αριθμός
    billing_city: Πόλη
    billing_zipcode: Τ.Κ.
    reapproval_notice: Η αλλαγή των εταιρικών στοιχείων (επωνυμία, ΑΦΜ, ΔΟΥ, δραστηριότητα) στέλνει την αίτηση ξανά για έγκριση — μέχρι την επανέγκριση ισχύουν οι τιμές λιανικής.
    submit: Υποβολή αίτησης
    update: Ενημέρωση στοιχείων
</i18n>
