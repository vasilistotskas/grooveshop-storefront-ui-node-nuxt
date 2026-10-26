<script lang="ts" setup>
const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png']

const { user, fetch } = useUserSession()
const { t } = useI18n()
const toast = useToast()
const { notify } = useApiError()
const form = useTemplateRef('form')
const img = useMediaStreamImage()

const userId = user.value?.id

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
    notify('settings:avatar', error, { title: t('avatar.error') })
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
</script>

<template>
  <UForm
    id="accountSettingsForm"
    ref="form"
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
