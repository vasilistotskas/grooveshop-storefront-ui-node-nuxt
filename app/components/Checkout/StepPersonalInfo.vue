<script lang="ts" setup>
const formState = defineModel<Record<string, any>>('formState', { required: true })

const props = defineProps<{
  schema: any
  countryOptions: Array<{ label: string, value: string }>
  regionOptions: Array<{ label: string, value: string }>
  savedAddresses?: UserAddressDetail[]
  selectedSavedAddressId?: number | null
  /**
   * ``saved`` = shopper picked a saved address (personal info + address
   * form sections collapse into the card summary); ``new`` = shopper is
   * typing a fresh address so the full form stays visible.
   */
  mode?: 'saved' | 'new'
}>()

const emit = defineEmits<{
  'next': []
  'country-change': []
  'select-saved-address': [addressId: number]
  'use-new-address': []
}>()

const { t } = useI18n()

const { loggedIn } = useUserSession()

const hasSavedAddresses = computed(() => (props.savedAddresses?.length ?? 0) > 0)
const isSavedMode = computed(() => props.mode === 'saved')
// "Save to my address book" only makes sense for authenticated users
// who are typing a fresh address — guests can't own addresses and
// shoppers in ``saved`` mode already have this one stored.
const canOfferSave = computed(() => loggedIn.value && !isSavedMode.value)

function onSelectSaved(id: number) {
  emit('select-saved-address', id)
}

function onUseNew() {
  emit('use-new-address')
}
</script>

<template>
  <UCard class="overflow-hidden">
    <template #header>
      <h2 class="text-xl font-semibold">
        {{ t('steps.info_and_address') }}
      </h2>
    </template>

    <UForm :state="formState" :schema="schema" class="space-y-6" @submit="emit('next')">
      <!-- Saved-address picker — renders visual cards and a "new
           address" option. Only shown when the shopper actually has
           saved addresses. Guests never see this section. -->
      <div v-if="hasSavedAddresses" class="space-y-4">
        <h3 class="text-lg font-medium text-primary-900 dark:text-primary-100">
          {{ t('delivery_address') }}
        </h3>
        <CheckoutSavedAddresses
          :addresses="savedAddresses ?? []"
          :selected-id="selectedSavedAddressId ?? null"
          :mode="mode ?? 'new'"
          @select="onSelectSaved"
          @new="onUseNew"
        />
      </div>

      <!-- Personal Information + full address form — hidden when the
           shopper selected a saved address (the card above already
           holds their name, phone, street, city, zipcode, country, and
           region, so re-rendering the inputs would be pure duplication).
           Displayed when: no saved addresses exist, OR the shopper
           explicitly chose "Νέα διεύθυνση". -->
      <template v-if="!isSavedMode">
        <USeparator v-if="hasSavedAddresses" />

        <div class="space-y-4">
          <h3 class="text-lg font-medium text-primary-900 dark:text-primary-100">
            {{ t('personal_information') }}
          </h3>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="t('form.first_name')" name="firstName" required>
              <UInput
                v-model="formState.firstName"
                size="xl"
                autocomplete="given-name"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('form.last_name')" name="lastName" required>
              <UInput
                v-model="formState.lastName"
                size="xl"
                autocomplete="family-name"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <UFormField :label="t('form.phone')" name="phone" required>
              <UInput
                v-model="formState.phone"
                type="tel"
                size="xl"
                autocomplete="tel-national"
                inputmode="tel"
                class="w-full"
              >
                <template #leading>
                  <span class="pl-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">+30</span>
                </template>
              </UInput>
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- Address fields (Greek postal norm: street → number → zipcode → city → area → region → country) -->
        <div class="space-y-4">
          <h3 v-if="!hasSavedAddresses" class="text-lg font-medium text-primary-900 dark:text-primary-100">
            {{ t('delivery_address') }}
          </h3>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <UFormField :label="t('form.street')" name="street" required class="md:col-span-2">
              <UInput
                v-model="formState.street"
                size="xl"
                autocomplete="address-line1"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('form.street_number')" name="streetNumber" required>
              <UInput
                v-model="formState.streetNumber"
                size="xl"
                autocomplete="address-line2"
                inputmode="numeric"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="t('form.zipcode')" name="zipcode" required>
              <UInput
                v-model="formState.zipcode"
                size="xl"
                autocomplete="postal-code"
                inputmode="numeric"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('form.city')" name="city" required>
              <UInput
                v-model="formState.city"
                size="xl"
                autocomplete="address-level2"
                leading-icon="i-heroicons-building-office-2"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField :label="t('form.place')" name="place">
              <UInput
                v-model="formState.place"
                size="xl"
                leading-icon="i-heroicons-map-pin"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('form.region')" name="region" required>
              <USelect
                v-model="formState.region"
                :items="regionOptions"
                size="xl"
                class="w-full"
                :disabled="!regionOptions.length"
              />
            </UFormField>
          </div>

          <UFormField :label="t('form.country')" name="country" required>
            <USelect
              v-model="formState.country"
              :items="countryOptions"
              size="xl"
              class="w-full"
              @update:model-value="emit('country-change')"
            />
          </UFormField>
        </div>
      </template>

      <!-- Order-level extras: always visible. ``customerNotes`` is an
           order annotation (not an address field), and ``place`` is the
           Greek neighborhood / area — not stored on UserAddress so it
           shows even in saved mode for folks who want to add a hint. -->
      <div class="space-y-4">
        <UFormField
          v-if="isSavedMode"
          :label="t('form.place')"
          name="place"
          :help="t('form.place_help_saved')"
        >
          <UInput
            v-model="formState.place"
            size="xl"
            leading-icon="i-heroicons-map-pin"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('form.customer_notes')" name="customerNotes">
          <UTextarea
            v-model="formState.customerNotes"
            :rows="3"
            size="xl"
            autoresize
            class="w-full"
          />
        </UFormField>

        <!-- Save-to-address-book affordance. The checkout form already
             collects every required UserAddress field except ``title``;
             the title input appears only once the user opts in so we
             don't clutter the form with a field most shoppers won't need. -->
        <template v-if="canOfferSave">
          <USeparator />
          <UCheckbox
            v-model="formState.saveAddress"
            :label="t('save_address.label')"
            :description="t('save_address.description')"
            color="primary"
          />
          <UFormField
            v-if="formState.saveAddress"
            :label="t('save_address.title_label')"
            :help="t('save_address.title_help')"
            name="addressTitle"
            required
          >
            <UInput
              v-model="formState.addressTitle"
              size="xl"
              :placeholder="t('save_address.title_placeholder')"
              leading-icon="i-heroicons-bookmark"
              class="w-full"
              maxlength="255"
            />
          </UFormField>
        </template>
      </div>

      <div class="flex justify-end">
        <UButton
          type="submit"
          size="lg"
          color="success"
          icon="i-heroicons-arrow-right"
          trailing
        >
          {{ t('continue') }}
        </UButton>
      </div>
    </UForm>
  </UCard>
</template>

<i18n lang="yaml">
el:
  steps:
    info_and_address: Στοιχεία & Διεύθυνση
  personal_information: Προσωπικά Στοιχεία
  delivery_address: Διεύθυνση Παράδοσης
  saved_addresses:
    label: "Επίλεξε αποθηκευμένη διεύθυνση"
    placeholder: "Επίλεξε διεύθυνση"
    help: "Διάλεξε μία από τις διευθύνσεις σου για να συμπληρωθούν αυτόματα τα πεδία."
  continue: Συνέχεια
  form:
    place_help_saved: "Προαιρετικό — προσθήκη περιοχής/γειτονιάς αν δεν υπάρχει ήδη στην αποθηκευμένη διεύθυνση."
  save_address:
    label: "Αποθήκευση της διεύθυνσης στον λογαριασμό μου"
    description: "Θα είναι διαθέσιμη σε επόμενες παραγγελίες για γρήγορη επιλογή."
    title_label: "Ονομασία διεύθυνσης"
    title_placeholder: "π.χ. Σπίτι, Δουλειά"
    title_help: "Δώσε ένα σύντομο όνομα για να τη βρίσκεις εύκολα."
</i18n>
