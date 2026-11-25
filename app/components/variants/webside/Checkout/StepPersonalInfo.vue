<script lang="ts" setup>
import type { FormError, FormErrorWithId } from '@nuxt/ui'

const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  countryOptions: Array<{ label: string, value: string }>
  savedAddresses?: UserAddressDetail[]
  selectedSavedAddressId?: number | null
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

const { t } = useStoreI18n('components/variants/webside/Checkout/StepPersonalInfo')

const hasSavedAddresses = computed(() => (props.savedAddresses?.length ?? 0) > 0)
const isSavedMode = computed(() => props.mode === 'saved')

function onSelectSaved(id: number) {
  emit('select-saved-address', id)
}

function onUseNew() {
  emit('use-new-address')
}

// Expose the form's submit() so the primary CTA (now living in
// the checkout sidebar) can trigger Zod validation + emit `next`
// just like the in-card button used to.
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
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <h2 class="text-xl font-semibold">
        {{ t('steps.details') }}
      </h2>
    </template>

    <UForm ref="formRef" :state="formState" :schema="schema" class="space-y-6" @error="onFormError" @submit="emit('next')">
      <!-- Saved-address picker — renders visual cards and a "new
           address" option. Only shown when the shopper actually has
           saved addresses. Guests never see this section. -->
      <div v-if="hasSavedAddresses" class="space-y-4">
        <h3
          class="
            text-lg font-medium text-primary-900
            dark:text-primary-100
          "
        >
          {{ t('recipient') }}
        </h3>
        <WebsideCheckoutSavedAddresses
          :addresses="savedAddresses ?? []"
          :selected-id="selectedSavedAddressId ?? null"
          :mode="mode ?? 'new'"
          @select="onSelectSaved"
          @new="onUseNew"
        />
      </div>

      <!-- Personal Information + the country — hidden when the shopper
           selected a saved address (the card above already holds their
           name, phone and country, so re-rendering the inputs would be
           pure duplication). Displayed when: no saved addresses exist,
           OR the shopper explicitly chose "Νέα διεύθυνση". The address
           itself is the delivery step's: a pickup order is delivered to
           the point and takes none. -->
      <template v-if="!isSavedMode">
        <USeparator v-if="hasSavedAddresses" />

        <div class="space-y-4">
          <h3
            class="
              text-lg font-medium text-primary-900
              dark:text-primary-100
            "
          >
            {{ t('personal_information') }}
          </h3>

          <div
            class="
              grid grid-cols-1 gap-4
              md:grid-cols-2
            "
          >
            <UFormField :label="t('form.first_name')" name="firstName" required>
              <UInput
                v-model="formState.firstName"
                size="xl"
                autocomplete="given-name"
                class="w-full"
                icon="i-heroicons-user"
              />
            </UFormField>

            <UFormField :label="t('form.last_name')" name="lastName" required>
              <UInput
                v-model="formState.lastName"
                size="xl"
                autocomplete="family-name"
                class="w-full"
                icon="i-heroicons-user"
              />
            </UFormField>
          </div>

          <div
            class="
              grid grid-cols-1 gap-4
              md:grid-cols-2
            "
          >
            <UFormField :label="t('form.email')" name="email" required>
              <UInput
                v-model="formState.email"
                type="email"
                size="xl"
                autocomplete="email"
                inputmode="email"
                leading-icon="i-heroicons-envelope"
                class="w-full"
              />
            </UFormField>

            <FormPhoneInput
              v-model="formState.phone"
              v-model:country="formState.phoneCountry"
              :label="t('form.phone')"
              name="phone"
              required
              :follow-country="formState.country"
              :pinned-countries="countryOptions.map(option => option.value)"
              size="xl"
            />
          </div>

          <!-- The country the order goes to: it sets the delivery
               options (and, for a home delivery, the postcode format
               and the regions). -->
          <UFormField :label="t('form.country')" name="country" required>
            <USelect
              v-model="formState.country"
              autocomplete="country"
              :items="countryOptions"
              size="xl"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>

      <!-- Order-level extras: always visible. ``customerNotes`` is an
           order annotation (not an address field). -->
      <div class="space-y-4">
        <UFormField
          :label="t('form.customer_notes')"
          :help="t('form.customer_notes_help')"
          name="customerNotes"
        >
          <UTextarea
            v-model="formState.customerNotes"
            :rows="3"
            size="xl"
            autoresize
            :maxlength="500"
            class="w-full"
          />
        </UFormField>
      </div>
    </UForm>
  </UCard>
</template>

<i18n lang="yaml">
el:
  personal_information: Προσωπικά Στοιχεία
  recipient: Στοιχεία Παραλήπτη
</i18n>
