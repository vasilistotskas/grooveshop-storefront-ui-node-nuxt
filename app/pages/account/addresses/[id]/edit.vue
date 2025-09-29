<script lang="ts" setup>
import * as z from 'zod'

const { t, locale } = useI18n()
const toast = useToast()
const route = useRoute()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const addressId = 'id' in route.params
  ? route.params.id
  : undefined
const regions = ref<Pagination<Region> | null>(null)

const { data: address } = await useFetch(`/api/user/addresses/${addressId}`, {
  key: `address${addressId}`,
  method: 'GET',
  headers: useRequestHeaders(),
  query: {
    language: locale,
  },
})

const { data: countries } = await useFetch(
  '/api/countries',
  {
    key: 'countries',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      language: locale,
    },
  },
)

const countryOptions = computed(() => {
  return countries.value?.results?.map((country) => {
    const countryName = extractTranslated(country, 'name', locale.value)
    return {
      name: countryName,
      value: country.alpha2,
    }
  }) || []
})

const fetchRegions = async (countryCode: string) => {
  if (countryCode === defaultSelectOptionChoose) {
    return
  }

  try {
    regions.value = await $fetch<ListRegionResponse>('/api/regions', {
      method: 'GET',
      query: {
        country: countryCode,
        language: locale.value,
      },
    })
  }
  catch (error) {
    console.error('Failed to fetch regions: ', error)
  }
}

const regionOptions = computed(() => {
  return regions.value?.results?.map((region) => {
    const regionName = extractTranslated(region, 'name', locale.value)
    return {
      name: regionName,
      value: region.alpha,
    }
  }) || []
})

const onSelectMenuChange = async ({ target, value }: { target: string, value: string }) => {
  if (target === 'country') {
    await fetchRegions(value)
  }
}

const onSubmit = async (values: any) => {
  await $fetch(`/api/user/addresses/${addressId}`, {
    method: 'PUT',
    headers: useRequestHeaders(),
    body: {
      title: values.title,
      firstName: values.firstName,
      lastName: values.lastName,
      street: values.street,
      streetNumber: values.streetNumber,
      city: values.city,
      zipcode: values.zipcode,
      floor: values.floor === defaultSelectOptionChoose ? undefined : values.floor,
      locationType: values.locationType === defaultSelectOptionChoose ? undefined : values.locationType,
      phone: values.phone,
      mobilePhone: values.mobilePhone,
      notes: values.notes,
      isMain: values.isMain,
      user: values.user,
      country: values.country === defaultSelectOptionChoose ? undefined : values.country,
      region: values.region === defaultSelectOptionChoose ? undefined : values.region,
    },
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('success'),
        color: 'success',
      })
      await navigateTo(localePath('account-addresses'))
    },
    onResponseError() {
      toast.add({
        title: t('error'),
        color: 'error',
      })
    },
  })
}

const onSetMain = async () => {
  await $fetch(`/api/user/addresses/${addressId}/set-main`, {
    method: 'POST',
    headers: useRequestHeaders(),
    async onResponse({ response }) {
      if (!response.ok) {
        return
      }
      toast.add({
        title: t('main.success'),
        color: 'success',
      })
      await navigateTo(localePath('account-addresses'))
    },
    onResponseError() {
      toast.add({
        title: t('main.error'),
        color: 'error',
      })
    },
  })
}

const formSchema = computed<DynamicFormSchema>(() => ({
  fields: [
    {
      name: 'title',
      label: t('form.title'),
      as: 'input',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: t('form.title'),
      autocomplete: 'honorific-prefix',
      initialValue: address.value?.title || '',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'firstName',
      label: t('form.first_name'),
      as: 'input',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: t('form.first_name'),
      autocomplete: 'given-name',
      initialValue: address.value?.firstName || '',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'lastName',
      label: t('form.last_name'),
      as: 'input',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: t('form.last_name'),
      autocomplete: 'family-name',
      initialValue: address.value?.lastName || '',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'street',
      label: t('form.street'),
      as: 'input',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: t('form.street'),
      autocomplete: 'address-line1',
      initialValue: address.value?.street || '',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'streetNumber',
      label: t('form.street_number'),
      as: 'input',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: t('form.street_number'),
      autocomplete: 'address-line2',
      initialValue: address.value?.streetNumber || '',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'city',
      label: t('form.city'),
      as: 'input',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: t('form.city'),
      autocomplete: 'address-level2',
      initialValue: address.value?.city || '',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'zipcode',
      label: t('form.zipcode'),
      as: 'input',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: t('form.zipcode'),
      autocomplete: 'postal-code',
      initialValue: address.value?.zipcode || '',
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'phone',
      label: t('form.phone'),
      as: 'input',
      type: 'text',
      required: false,
      readonly: false,
      placeholder: t('form.phone'),
      autocomplete: 'tel',
      initialValue: address.value?.phone || '',
      rules: z.string().optional(),
    },
    {
      name: 'mobilePhone',
      label: t('form.mobile_phone'),
      as: 'input',
      type: 'text',
      required: false,
      readonly: false,
      placeholder: t('form.mobile_phone'),
      autocomplete: 'tel',
      initialValue: address.value?.mobilePhone || '',
      rules: z.string().optional(),
    },
    {
      name: 'floor',
      label: t('form.floor'),
      as: 'select',
      type: 'text',
      required: false,
      readonly: false,
      placeholder: defaultSelectOptionChoose,
      autocomplete: 'off',
      initialValue: address.value?.floor || defaultSelectOptionChoose,
      children: floorChoicesList.map(option => ({
        tag: 'option',
        text: option.name || '',
        as: 'option',
        label: option.name,
        value: option.value,
      })),
      rules: z.union([zFloorEnum, z.string()]).optional(),
    },
    {
      name: 'locationType',
      label: t('form.location_type'),
      as: 'select',
      type: 'text',
      required: false,
      readonly: false,
      placeholder: defaultSelectOptionChoose,
      autocomplete: 'off',
      initialValue: address.value?.locationType || defaultSelectOptionChoose,
      children: locationChoicesList.map(option => ({
        tag: 'option',
        text: option.name || '',
        as: 'option',
        label: option.name,
        value: option.value,
      })),
      rules: z.union([zLocationTypeEnum, z.string()]).optional(),
    },
    {
      name: 'country',
      label: t('form.country'),
      as: 'select',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: defaultSelectOptionChoose,
      autocomplete: 'country',
      initialValue: address.value?.country || defaultSelectOptionChoose,
      children: (countryOptions.value || []).map(option => ({
        tag: 'option',
        text: option.name || '',
        as: 'option',
        label: option.name,
        value: option.value,
      })),
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'region',
      label: t('form.region'),
      as: 'select',
      type: 'text',
      required: true,
      readonly: false,
      placeholder: defaultSelectOptionChoose,
      autocomplete: 'address-level1',
      initialValue: address.value?.region || defaultSelectOptionChoose,
      children: (regionOptions.value || []).map(option => ({
        tag: 'option',
        text: option.name || '',
        as: 'option',
        label: option.name,
        value: option.value,
      })),
      rules: z.string({ error: issue => issue.input === undefined
        ? $i18n.t('validation.required')
        : $i18n.t('validation.string.invalid') }),
    },
    {
      name: 'notes',
      label: t('form.notes'),
      as: 'textarea',
      type: 'text',
      required: false,
      readonly: false,
      placeholder: t('form.notes'),
      autocomplete: 'off',
      initialValue: address.value?.notes || '',
      rules: z.string().optional(),
    },
    {
      name: 'isMain',
      hidden: true,
      type: 'checkbox',
      as: 'checkbox',
      autocomplete: 'off',
      required: false,
      readonly: false,
      placeholder: '',
      initialValue: address.value?.isMain || false,
      rules: z.boolean().optional(),
    },
    {
      name: 'user',
      hidden: true,
      type: 'number',
      as: 'input',
      autocomplete: 'off',
      required: false,
      readonly: false,
      placeholder: '',
      initialValue: address.value?.user || null,
      rules: z.union([z.number(), zUserDetails]).optional(),
    },
  ],
}))

onMounted(async () => {
  if (address.value?.country && address.value.country !== defaultSelectOptionChoose) {
    await fetchRegions(address.value.country)
  }
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <div
      :class="[
        'flex items-center justify-between gap-4',
        { main: address?.isMain },
      ]"
    >
      <div class="flex items-center gap-4">
        <UButton
          :to="localePath('account-addresses')"
          :trailing="true"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-left"
          size="sm"
        >
          <span class="sr-only">{{
            t('back')
          }}</span>
        </UButton>
        <PageTitle
          class="md:mt-0"
          :text="`${t('title')} ${address?.id}`"
        />
      </div>
      <div
        v-if="address?.isMain"
        class="flex items-center"
      >
        <span
          class="
            mr-2 text-green-500
            dark:text-green-400
          "
        >
          <UIcon name="i-fa6-circle-check" />
        </span>
        <UBadge
          icon="i-heroicons-check-badge"
          size="lg"
          color="success"
          variant="solid"
        >
          {{ t('main.title') }}
        </UBadge>
      </div>
      <UButton
        v-else
        :label="t('main.button')"
        :trailing="true"
        class="gap-4"
        color="secondary"
        variant="outline"
        icon="i-heroicons-check-circle"
        @click="onSetMain"
      />
    </div>

    <div
      v-if="address"
      class="
        rounded-lg bg-primary-100 p-4
        dark:bg-primary-900
      "
    >
      <DynamicForm
        ref="formRef"
        :button-label="t('form.update')"
        :schema="formSchema"
        :loading="false"
        @submit="onSubmit"
        @select-menu-change="onSelectMenuChange"
      />
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επεξεργασία διεύθυνσης
  error: Σφάλμα ενημέρωσης διεύθυνσης
  success: Η διεύθυνση ενημερώθηκε με επιτυχία
  back: Επιστροφή στις διευθύνσεις
  main:
    title: Κύρια
    success: Η κύρια διεύθυνση ενημερώθηκε με επιτυχία
    error: Σφάλμα ενημέρωσης κύριας διεύθυνσης
    button: Ορισμός ως κύρια διεύθυνση
  form:
    title: Διεύθυνση
    first_name: Όνομα
    last_name: Επίθετο
    street: Δρόμος
    street_number: Αριθμός δρόμου
    city: Πόλη
    zipcode: Ταχυδρομικός Κώδικας
    phone: Τηλέφωνο
    mobile_phone: Κινητό τηλέφωνο
    notes: Σημειώσεις
    floor: Όροφος
    location_type: Τύπος τοποθεσίας
    country: Χώρα
    region: Περιφέρεια
    submit: Αποθήκευση
    update: Ενημέρωση
  validation:
    title:
      min: Ο τίτλος πρέπει να αποτελείται από τουλάχιστον {min} χαρακτήρες
    first_name:
      min: Το όνομα πρέπει να είναι τουλάχιστον {min} χαρακτήρες
    last_name:
      min: Το επώνυμο πρέπει να είναι τουλάχιστον {min} χαρακτήρες
    street:
      min: Η οδός πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    street_number:
      min: Ο αριθμός οδού πρέπει να είναι τουλάχιστον {min} χαρακτήρες
    city:
      min: Η πόλη πρέπει να έχει τουλάχιστον {min} χαρακτήρες
    zipcode:
      min: Ο ταχυδρομικός κώδικας πρέπει να είναι τουλάχιστον {min} χαρακτήρες
    region:
      required: Απαιτείται Περιφέρεια
</i18n>
