<script lang="ts" setup>
import type { FormError, FormErrorWithId } from '@nuxt/ui'

const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  countryOptions: Array<{ label: string, value: string }>
  savedAddresses?: UserAddressDetail[]
  selectedSavedAddressId?: number | null
  /** Saved addresses that fail checkout's rules, marked in the picker. */
  addressIdsNeedingUpdate?: number[]
  /**
   * ``saved`` = shopper picked a saved address (personal info + address
   * form sections collapse into the card summary); ``new`` = shopper is
   * typing a fresh address so the full form stays visible.
   */
  mode?: 'saved' | 'new'
  /**
   * Django's field errors from a rejected order, shown under their
   * inputs through ``UForm``'s ``setErrors``.
   */
  serverErrors?: FormError[]
}>()

const emit = defineEmits<{
  'next': []
  'select-saved-address': [addressId: number]
  'use-new-address': []
  'edit-address': []
}>()

const { t } = useStoreI18n('components/Checkout/StepPersonalInfo')

const hasSavedAddresses = computed(() => (props.savedAddresses?.length ?? 0) > 0)
const isSavedMode = computed(() => props.mode === 'saved')

function onSelectSaved(id: number) {
  emit('select-saved-address', id)
}

function onUseNew() {
  emit('use-new-address')
}

const CARD = 'flex flex-col gap-5 rounded-[1.25rem] bg-default p-5 ring ring-default sm:p-6'
const HEADING = 'font-display text-[1.375rem] font-bold text-highlighted'

// Expose the form's submit() so the primary CTA (it lives under the step,
// in the checkout page) can trigger Zod validation + emit `next`.
const formRef = useTemplateRef<{
  submit: () => Promise<void>
  validate: (opts: { name?: string[], silent?: boolean }) => Promise<unknown>
  setErrors: (errors: FormError[]) => void
  getErrors: () => FormErrorWithId[]
}>('formRef')
defineExpose({
  submit: () => formRef.value?.submit(),
})

// Errors on the fields the ``saved`` mode does not render open them first.
const { onFormError, showServerErrors } = useSavedAddressErrors({
  form: formRef,
  isSavedMode,
  openFields: () => emit('edit-address'),
})

// The step mounts after a rejected order sends the shopper back here,
// so apply on mount as well as on change.
const applyServerErrors = () => showServerErrors(props.serverErrors)
onMounted(applyServerErrors)
watch(() => props.serverErrors, applyServerErrors)

// A picked address that fails checkout's rules opens in the form with
// its card still picked (``validateAppliedAddress``): mark what is wrong
// on its fields rather than wait for «Continue». Django's own messages,
// when an order came back rejected, are the ones to show: validating
// those fields again would replace them.
const editingSavedAddress = computed(() => !isSavedMode.value && props.selectedSavedAddressId != null)
async function markSavedAddressErrors() {
  if (!editingSavedAddress.value || props.serverErrors?.length) return
  await formRef.value?.validate({ name: [...SAVED_ADDRESS_FIELDS], silent: true })
}
onMounted(markSavedAddressErrors)
watch(editingSavedAddress, markSavedAddressErrors, { flush: 'post' })
</script>

<template>
  <UForm
    ref="formRef"
    :state="formState"
    :schema="schema"
    class="flex flex-col gap-6"
    @error="onFormError"
    @submit="emit('next')"
  >
    <!-- Contact — hidden with the rest of the typed details when the
         shopper picked a saved address, which already holds them. -->
    <section
      v-if="!isSavedMode"
      aria-labelledby="checkout-contact-title"
      :class="CARD"
    >
      <h2
        id="checkout-contact-title"
        :class="HEADING"
      >
        {{ t('contact.title') }}
      </h2>

      <div
        class="
          grid grid-cols-1 gap-4
          md:grid-cols-2
        "
      >
        <UFormField
          :label="t('form.email')"
          name="email"
          required
        >
          <UInput
            v-model="formState.email"
            type="email"
            size="lg"
            autocomplete="email"
            inputmode="email"
            leading-icon="i-lucide-mail"
            class="w-full"
          />
        </UFormField>

        <div class="flex flex-col gap-1.5">
          <FormPhoneInput
            v-model="formState.phone"
            v-model:country="formState.phoneCountry"
            :label="t('form.phone')"
            name="phone"
            required
            :follow-country="formState.country"
            :pinned-countries="countryOptions.map(option => option.value)"
            size="lg"
          />
          <p class="text-xs text-toned">
            {{ t('contact.phone_help') }}
          </p>
        </div>
      </div>
    </section>

    <section
      aria-labelledby="checkout-address-title"
      :class="CARD"
    >
      <h2
        id="checkout-address-title"
        :class="HEADING"
      >
        {{ t('recipient') }}
      </h2>

      <!-- Saved addresses as cards, and the way to type a new one. Only
           for a shopper who actually has some; guests never see this. -->
      <CheckoutSavedAddresses
        v-if="hasSavedAddresses"
        :addresses="savedAddresses ?? []"
        :selected-id="selectedSavedAddressId ?? null"
        :needing-update="addressIdsNeedingUpdate ?? []"
        :mode="mode ?? 'new'"
        @select="onSelectSaved"
        @new="onUseNew"
      />

      <!-- The typed recipient — hidden while a saved address is picked:
           its card already holds the name, phone and country, so the
           inputs would be pure duplication. -->
      <template v-if="!isSavedMode">
        <USeparator v-if="hasSavedAddresses" />

        <div
          class="
            grid grid-cols-1 gap-4
            md:grid-cols-2
          "
        >
          <UFormField
            :label="t('form.first_name')"
            name="firstName"
            required
          >
            <UInput
              v-model="formState.firstName"
              size="lg"
              autocomplete="given-name"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('form.last_name')"
            name="lastName"
            required
          >
            <UInput
              v-model="formState.lastName"
              size="lg"
              autocomplete="family-name"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- The country the order goes to: it sets the delivery options
             (and, for a home delivery, the postcode format and the
             regions). The address itself is the delivery step's: a
             pickup order is delivered to the point and takes none. -->
        <UFormField
          :label="t('form.country')"
          name="country"
          required
        >
          <USelect
            v-model="formState.country"
            autocomplete="country"
            :items="countryOptions"
            size="lg"
            class="w-full"
          />
        </UFormField>
      </template>
    </section>

    <!-- An annotation on the order, not an address field: always shown. -->
    <section :class="CARD">
      <UFormField
        :label="t('form.customer_notes')"
        :help="t('form.customer_notes_help')"
        name="customerNotes"
      >
        <UTextarea
          v-model="formState.customerNotes"
          :rows="3"
          size="lg"
          autoresize
          :maxlength="500"
          class="w-full"
        />
      </UFormField>
    </section>
  </UForm>
</template>

<i18n lang="yaml">
el:
  contact:
    title: Στοιχεία επικοινωνίας
    phone_help: Για ενημερώσεις παράδοσης με SMS.
  recipient: Παραλήπτης
en:
  contact:
    title: Contact
    phone_help: For delivery updates by SMS.
  recipient: Recipient
</i18n>
