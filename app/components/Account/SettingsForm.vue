<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { getLocalTimeZone, parseDate } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '~~/i18n/locales'

// What the API accepts as a handle (`UsernameUpdateRequest`).
const USERNAME_PATTERN = /^[\w.@+#-]+$/
const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png']

const { user, fetch } = useUserSession()
const { t, locale } = useI18n()
const { setLanguage } = useUserLanguage()
const toast = useToast()
const img = useMediaStreamImage()

const regions = ref<Pagination<Region> | null>(null)
const userId = user.value?.id

const selectPlaceholder = computed(() => t('form.select_placeholder'))

const schema = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.email.valid'),
  }),
  firstName: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).max(255, {
    error: t('validation.max', { max: 255 }),
  }),
  lastName: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).max(255, {
    error: t('validation.max', { max: 255 }),
  }),
  // Empty keeps the current handle; a new one goes through the
  // dedicated change-username request, which rejects a taken one.
  username: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).max(30, {
    error: t('validation.max', { max: 30 }),
  }).refine(value => !value || USERNAME_PATTERN.test(value), {
    error: t('form.username_invalid'),
  }),
  // Optional in Django (UserAccount.phone is blank=True) but when
  // present it must pass the same plausibility check the checkout
  // applies, against the country picked in the phone field (it follows
  // this form's own country until then — see ``formCountry``).
  phone: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).refine(
    value => !value || isPlausiblePhone(
      value,
      resolvePhoneCountry(countries.value?.results, phonePick.value) ?? formCountry.value,
    ),
    { error: t('validation.phone.invalid') },
  ),
  city: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).max(255, {
    error: t('validation.max', { max: 255 }),
  }),
  zipcode: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).max(255, {
    error: t('validation.max', { max: 255 }),
  }),
  address: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).max(255, {
    error: t('validation.max', { max: 255 }),
  }),
  place: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }).max(255, {
    error: t('validation.max', { max: 255 }),
  }).optional(),
  birthDate: z.preprocess(
    (input) => {
      if (typeof input === 'string' || input instanceof Date) {
        const date = new Date(input)
        return isNaN(date.getTime()) ? undefined : date
      }
      return undefined
    },
    z.date({
      error: issue => issue.input === undefined
        ? t('validation.date.required_error')
        : t('validation.date.invalid_type_error'),
    }).optional(),
  ),
  country: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') })
    .default(defaultSelectOptionChoose)
    .optional(),
  region: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') })
    .default(defaultSelectOptionChoose)
    .optional(),
  languageCode: z.enum(SUPPORTED_LOCALES, {
    error: () => t('validation.string.invalid'),
  }).default(DEFAULT_LOCALE),
})

type Schema = z.output<typeof schema>

const userLanguage = (user.value?.languageCode && SUPPORTED_LOCALES.includes(user.value.languageCode as typeof SUPPORTED_LOCALES[number]))
  ? user.value.languageCode as typeof SUPPORTED_LOCALES[number]
  : DEFAULT_LOCALE

// Every country with a dial code, unpaginated (the shared phone source):
// the account's country is not a delivery address, so it is not limited to
// what the store ships to. (The default page holds 12 rows.)
const { data: countries } = await usePhoneCountries()

// The country picked in the phone field; empty while it follows the form's.
const phonePick = ref('')

const state = reactive<Partial<Schema>>({
  email: user.value?.email || '',
  firstName: user.value?.firstName || '',
  lastName: user.value?.lastName || '',
  username: user.value?.username || '',
  // Stored as E.164 (e.g. "+306912345678"); the phone field parses it back
  // into its country picker and the national digits.
  phone: user.value?.phone || '',
  city: user.value?.city || '',
  zipcode: user.value?.zipcode || '',
  address: user.value?.address || '',
  place: user.value?.place || '',
  // Mirrors `calendarDate` (the watch at the end), which holds the saved day.
  birthDate: undefined,
  country: user.value?.country || defaultSelectOptionChoose,
  region: user.value?.region || defaultSelectOptionChoose,
  languageCode: userLanguage,
})

// The form's own (live) country field, falling back to the first listed
// country while it's still the unselected placeholder: what the phone field
// follows, and what validates the phone until a country is picked in it.
// Referenced by the ``phone`` refine above; the closure resolves it lazily
// at validation time, by when this is already initialised.
//
// A plain ref updated via watch() — not a computed reading
// state.country directly — because a computed's initializer touching
// state (typed Partial<Schema>) closes a cycle back through the
// schema's own phone refine (schema -> formCountry -> state ->
// Schema -> schema, TS2456). Explicitly typing this ref breaks it: the
// watch callback below still reads state.country, but that's a
// separate statement, not part of formCountry's own type.
const formCountry = ref<Country | undefined>(resolvePhoneCountry(
  countries.value?.results,
  user.value?.country,
  { fallbackToFirst: true },
))
watch(() => state.country, (newCountry) => {
  formCountry.value = resolvePhoneCountry(
    countries.value?.results,
    newCountry !== defaultSelectOptionChoose ? newCountry : undefined,
    { fallbackToFirst: true },
  )
})

const languageOptions = computed(() => {
  const names = new Intl.DisplayNames([locale.value], { type: 'language' })
  return SUPPORTED_LOCALES.map(code => ({
    label: names.of(code) ?? code,
    value: code,
  }))
})

const isSubmitting = ref(false)

// Django's birth date is a plain 'YYYY-MM-DD' day. Parse it as one:
// `new Date('YYYY-MM-DD')` is UTC midnight, the day before west of UTC.
const calendarDate = shallowRef<DateValue | null>(
  user.value?.birthDate ? parseDate(user.value.birthDate) : null,
)

const countryOptions = computed(() => {
  const options = countries.value?.results?.map((country) => {
    const countryName = extractTranslated(country, 'name', locale.value)
    return {
      label: countryName,
      value: country.alpha2,
    }
  }) || []

  return [
    {
      label: selectPlaceholder.value,
      value: defaultSelectOptionChoose,
      disabled: true,
    },
    ...options,
  ]
})

const fetchRegions = async () => {
  if (state.country === defaultSelectOptionChoose) {
    return
  }

  try {
    regions.value = await $api<ListRegionResponse>('/api/regions', {
      method: 'GET',
      query: {
        country: state.country,
        languageCode: locale.value,
      },
    })
  }
  catch {
    toast.add({
      title: t('error.default'),
      description: t('error_occurred'),
      color: 'error',
    })
  }
}

if (countries.value) {
  await fetchRegions()
}

const regionOptions = computed(() => {
  const options = regions.value?.results?.map((region) => {
    const regionName = extractTranslated(region, 'name', locale.value)
    return {
      label: regionName,
      value: region.alpha,
    }
  }) || []

  return [
    {
      label: selectPlaceholder.value,
      value: defaultSelectOptionChoose,
      disabled: true,
    },
    ...options,
  ]
})

const onCountryChange = async (payload: string | undefined) => {
  if (!payload) return
  state.country = String(payload)
  state.region = defaultSelectOptionChoose
  await fetchRegions()
}

const avatarSrc = computed(() => {
  const path = user.value?.mainImagePath
  return path ? img(path, { width: 144, height: 144, fit: 'cover' }, { provider: 'mediaStream' }) : undefined
})
const avatarName = computed(() => displayUserName(user.value))
const avatarFile = ref<File | null>(null)
const isAvatarBusy = ref(false)

// The photo is its own request, never part of the profile save: the file
// goes up as multipart, and an empty `image` clears it.
const patchAvatar = async (image: File | '', successTitle: string) => {
  const body = new FormData()
  body.append('image', image)
  isAvatarBusy.value = true
  try {
    await $api(`/api/user/account/${userId}`, { method: 'PATCH', body })
    await fetch()
    toast.add({ title: successTitle, color: 'success' })
  }
  catch (error) {
    log.error({ action: 'account:avatarUpdate', error })
    toast.add({ title: t('avatar.error'), color: 'error' })
  }
  finally {
    isAvatarBusy.value = false
  }
}

const uploadAvatar = async (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!AVATAR_EXTENSIONS.includes(extension)) {
    toast.add({ title: t('avatar.invalid_type'), color: 'error' })
    return
  }
  await patchAvatar(file, t('avatar.updated'))
}

watch(avatarFile, async (file) => {
  if (!file) return
  await uploadAvatar(file)
  avatarFile.value = null
})

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isSubmitting.value = true

  const values = { ...event.data }

  if (
    values.region === defaultSelectOptionChoose
    || values.country === defaultSelectOptionChoose
  ) {
    values.region = undefined
    values.country = undefined
  }

  if (!userId) {
    isSubmitting.value = false
    return
  }

  const previousLanguage = locale.value
  const nextLanguage = values.languageCode || DEFAULT_LOCALE

  if (values.username && values.username !== user.value?.username) {
    try {
      await $api(`/api/user/account/${userId}/change-username`, {
        method: 'POST',
        body: { username: values.username },
      })
    }
    catch (error) {
      // The reason (409 "Username already taken.") is Django's own text.
      toast.add({ title: getErrorDetail(error) || t('form.error'), color: 'error' })
      isSubmitting.value = false
      return
    }
  }

  try {
    await $api(`/api/user/account/${userId}`, {
      method: 'PUT',
      body: {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        city: values.city,
        zipcode: values.zipcode,
        address: values.address,
        place: values.place,
        // Serialize the picked day straight from the timezone-agnostic
        // CalendarDate — its toString() yields 'YYYY-MM-DD' directly. Never go
        // via Date.toISOString(), which converts local midnight to UTC and
        // shifts the day back for UTC+ timezones (e.g. Europe/Athens),
        // compounding one day per save.
        birthDate: calendarDate.value ? calendarDate.value.toString() : null,
        country: values.country,
        region: values.region,
        languageCode: nextLanguage,
      },
    })
  }
  catch {
    // ofetch rejects on a 4xx/5xx; rethrown, UForm would hand it to
    // Vue's error handler as an app error.
    toast.add({ title: t('form.error'), color: 'error' })
    isSubmitting.value = false
    return
  }

  await fetch()
  if (nextLanguage !== previousLanguage) {
    // setLanguage keeps UI locale, i18n cookie, and Django's stored
    // language_code in sync; the PUT above already wrote the new value,
    // so this call only flips the UI locale (the subsequent PATCH is a
    // no-op when stored === code).
    await setLanguage(nextLanguage)
  }
  toast.add({
    title: t('form.success'),
    color: 'success',
  })
  isSubmitting.value = false
}

watch(calendarDate, (newVal) => {
  if (newVal) {
    state.birthDate = newVal.toDate(getLocalTimeZone())
  }
  else {
    state.birthDate = undefined
  }
}, { immediate: true })
</script>

<template>
  <UForm
    id="accountSettingsForm"
    :aria-label="t('form.label')"
    :schema="schema"
    :state="state"
    class="
      flex flex-col gap-6 rounded-[1.25rem] bg-default p-5 ring ring-default
      sm:p-6
    "
    @error="scrollToFirstFormError"
    @submit="onSubmit"
  >
    <div class="flex flex-wrap items-center gap-4">
      <UAvatar
        :src="avatarSrc"
        :alt="avatarName"
        class="size-18 shrink-0 text-2xl"
        :ui="{ root: 'bg-volt', fallback: 'font-display font-bold text-on-volt' }"
      />
      <div class="flex flex-wrap items-center gap-2">
        <UFileUpload
          v-slot="{ open }"
          v-model="avatarFile"
          accept="image/jpeg,image/png"
          :interactive="false"
        >
          <UButton
            :label="t('avatar.upload')"
            :loading="isAvatarBusy"
            color="neutral"
            variant="outline"
            @click="() => { open() }"
          />
        </UFileUpload>
        <UButton
          v-if="user?.mainImagePath"
          :label="t('avatar.remove')"
          :disabled="isAvatarBusy"
          color="neutral"
          variant="ghost"
          @click="() => { patchAvatar('', t('avatar.removed')) }"
        />
      </div>
    </div>

    <div
      class="
        grid gap-x-4 gap-y-5
        sm:grid-cols-2
      "
    >
      <UFormField
        :label="t('form.first_name')"
        name="firstName"
        :required="true"
      >
        <UInput
          v-model="state.firstName"
          autocomplete="given-name"
          class="w-full"
          type="text"
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
          autocomplete="family-name"
          class="w-full"
          type="text"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.username')"
        name="username"
      >
        <UInput
          v-model="state.username"
          autocomplete="username"
          class="w-full"
          type="text"
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
        :label="t('form.birth_date')"
        name="birthDate"
      >
        <UInputDate
          v-model="calendarDate"
          icon="i-lucide-calendar"
          class="w-full"
          size="xl"
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
          size="xl"
          value-key="value"
        />
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
          size="xl"
          @update:model-value="onCountryChange"
        />
      </UFormField>

      <UFormField
        :label="t('form.city')"
        name="city"
      >
        <UInput
          v-model="state.city"
          autocomplete="address-level2"
          class="w-full"
          type="text"
          size="xl"
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
          size="xl"
          value-key="value"
        />
      </UFormField>

      <UFormField
        :label="t('form.zipcode')"
        name="zipcode"
      >
        <UInput
          v-model="state.zipcode"
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
          autocomplete="address-line1"
          class="w-full"
          type="text"
          size="xl"
        />
      </UFormField>

      <UFormField
        :label="t('form.place')"
        name="place"
      >
        <UInput
          v-model="state.place"
          autocomplete="address-level3"
          class="w-full"
          type="text"
          size="xl"
        />
      </UFormField>
    </div>

    <UButton
      :loading="isSubmitting"
      :disabled="isSubmitting"
      :label="t('form.submit')"
      type="submit"
      color="neutral"
      size="lg"
      class="
        max-sm:w-full max-sm:justify-center
        sm:self-start
      "
    />
  </UForm>
</template>

<i18n lang="yaml">
el:
  avatar:
    upload: Ανέβασμα φωτογραφίας
    remove: Αφαίρεση
    updated: Η φωτογραφία ενημερώθηκε
    removed: Η φωτογραφία αφαιρέθηκε
    invalid_type: Επιτρέπονται μόνο αρχεία JPG και PNG
    error: Η φωτογραφία δεν ενημερώθηκε
  form:
    label: Στοιχεία προφίλ
    select_placeholder: Επέλεξε
    first_name: Όνομα
    last_name: Επώνυμο
    username: Όνομα χρήστη
    username_invalid: Χωρίς κενά· μόνο γράμματα, αριθμοί και σύμβολα.
    phone: Κινητό τηλέφωνο
    city: Πόλη
    zipcode: Ταχυδρομικός κώδικας
    address: Διεύθυνση
    place: Τοποθεσία
    birth_date: Ημερομηνία γέννησης
    country: Χώρα
    region: Περιοχή
    language: Γλώσσα
    language_help: Χρησιμοποιείται για email και μηνύματα διεπαφής.
    submit: Αποθήκευση αλλαγών
    success: Τα στοιχεία αποθηκεύτηκαν επιτυχώς
    error: Σφάλμα
en:
  avatar:
    upload: Upload photo
    remove: Remove
    updated: Your photo was updated
    removed: Your photo was removed
    invalid_type: Only JPG and PNG files are allowed
    error: Your photo was not updated
  form:
    label: Profile details
    select_placeholder: Choose
    first_name: First name
    last_name: Last name
    username: Username
    username_invalid: No spaces; letters, numbers and symbols only.
    phone: Mobile phone
    city: City
    zipcode: Postcode
    address: Address
    place: Location
    birth_date: Date of birth
    country: Country
    region: Region
    language: Language
    language_help: Used for emails and for the interface.
    submit: Save changes
    success: Your details were saved
    error: That did not work
</i18n>
