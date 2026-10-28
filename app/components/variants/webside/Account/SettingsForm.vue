<script lang="ts" setup>
import { DateFormatter, getLocalTimeZone } from '@internationalized/date'

defineSlots<{
  default(props: object): any
}>()

const { t, locale } = useStoreI18n('components/variants/webside/Account/SettingsForm')
const form = useTemplateRef('form')

const {
  schema,
  state,
  isSubmitting,
  phonePick,
  formCountry,
  calendarDate,
  languageOptions,
  countryOptions,
  regionOptions,
  onCountryChange,
  onSubmit,
} = await useSettingsForm({ form, t })

const label = computed(() => {
  return calendarDate.value
    ? new DateFormatter(locale.value, { dateStyle: 'medium' }).format(calendarDate.value.toDate(getLocalTimeZone()))
    : t('form.birth_date')
})
</script>

<template>
  <div
    class="
      grid gap-4
      lg:flex
    "
  >
    <slot />
    <UForm
      id="accountSettingsForm"
      ref="form"
      :schema="schema"
      :state="state"
      class="
        flex w-full flex-col gap-4 rounded bg-primary-100 p-4
        md:grid md:grid-cols-2
        dark:bg-primary-900
      "
      @error="scrollToFirstFormError"
      @submit="onSubmit"
    >
      <UFormField
        :label="t('form.first_name')"
        name="firstName"
        :required="true"
      >
        <UInput
          v-model="state.firstName"
          :placeholder="t('form.first_name')"
          autocomplete="given-name"
          class="w-full"
          type="text"
          icon="i-heroicons-user"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.last_name')"
        name="lastName"
        :required="true"
      >
        <UInput
          v-model="state.lastName"
          :placeholder="t('form.last_name')"
          autocomplete="family-name"
          class="w-full"
          type="text"
          icon="i-heroicons-user"
          size="xl"
        />
      </UFormField>

      <FormPhoneInput
        v-model="state.phone"
        v-model:country="phonePick"
        :label="t('form.phone')"
        name="phone"
        :follow-country="formCountry?.alpha2"
        size="xl"
      />

      <UFormField
        :label="t('form.city')"
        name="city"
      >
        <UInput
          v-model="state.city"
          :placeholder="t('form.city')"
          autocomplete="address-level2"
          class="w-full"
          type="text"
          icon="i-heroicons-building-office-2"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.zipcode')"
        name="zipcode"
      >
        <UInput
          v-model="state.zipcode"
          :placeholder="t('form.zipcode')"
          autocomplete="postal-code"
          class="w-full"
          type="text"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.address')"
        name="address"
      >
        <UInput
          v-model="state.address"
          :placeholder="t('form.address')"
          autocomplete="address-line1"
          class="w-full"
          type="text"
          icon="i-heroicons-map-pin"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.place')"
        name="place"
      >
        <UInput
          v-model="state.place"
          :placeholder="t('form.place')"
          autocomplete="address-level3"
          class="w-full"
          type="text"
          icon="i-heroicons-map"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.birth_date')"
        name="birthDate"
      >
        <UPopover :popper="{ placement: 'bottom-start' }">
          <UButton
            :label="label"
            color="neutral"
            icon="i-heroicons-calendar-days-20-solid"
          />
          <template #content>
            <UCalendar
              v-model="calendarDate"
              color="secondary"
              class="p-2"
            />
          </template>
        </UPopover>
      </UFormField>

      <UFormField
        :label="t('form.country')"
        name="country"
      >
        <USelect
          v-model="state.country"
          name="country"
          autocomplete="country"
          value-key="value"
          :items="countryOptions"
          color="neutral"
          class="w-full"
          @update:model-value="onCountryChange"
        />
      </UFormField>

      <UFormField
        :label="t('form.region')"
        name="region"
      >
        <USelect
          v-model="state.region"
          name="region"
          autocomplete="address-level1"
          :items="regionOptions"
          color="neutral"
          class="w-full"
          value-key="value"
        />
      </UFormField>

      <UFormField
        :label="t('form.language')"
        name="languageCode"
        :description="t('form.language_help')"
      >
        <USelect
          v-model="state.languageCode"
          name="languageCode"
          :items="languageOptions"
          :disabled="languageOptions.length < 2"
          color="neutral"
          class="w-full"
          value-key="value"
        />
      </UFormField>

      <div class="col-span-2 grid items-end justify-end">
        <UButton
          :loading="isSubmitting"
          :disabled="isSubmitting"
          :label="t('form.submit')"
          type="submit"
          color="secondary"
          size="lg"
        />
      </div>
    </UForm>
  </div>
</template>

<i18n lang="yaml">
el:
  form:
    select_placeholder: Επέλεξε
    first_name: Όνομα
    last_name: Επώνυμο
    phone: Τηλέφωνο
    city: Πόλη
    zipcode: Ταχυδρομικός κώδικας
    address: Διεύθυνση
    place: Τοποθεσία
    birth_date: Ημερομηνία γέννησης
    country: Χώρα
    region: Περιοχή
    language: Γλώσσα
    language_help: Χρησιμοποιείται για email και μηνύματα διεπαφής.
    submit: Υποβολή
    success: Τα στοιχεία αποθηκεύτηκαν επιτυχώς
    error: Σφάλμα
en:
  form:
    select_placeholder: Choose
    first_name: First name
    last_name: Last name
    phone: Phone
    city: City
    zipcode: Postcode
    address: Address
    place: Location
    birth_date: Date of birth
    country: Country
    region: Region
    language: Language
    language_help: Used for emails and for the interface.
    submit: Save
    success: Your details were saved
    error: That did not work
</i18n>
