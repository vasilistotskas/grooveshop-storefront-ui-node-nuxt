<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const emit = defineEmits(['emailVerify'])

const { emailVerify } = useAllAuthAuthentication()
const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()
const router = useRouter()
const { isMobileOrTablet } = useDevice()

const loading = ref(false)
const hasError = ref(false)
const code = ref<string[]>([])

const items = computed(() => [
  {
    to: localePath('index'),
    label: $i18n.t('breadcrumb.items.index.label'),
    icon: $i18n.t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('account-login'),
    label: t('breadcrumb.items.account-login.label'),
    icon: t('breadcrumb.items.account-login.icon'),
  },
  {
    to: localePath('account-verify-email'),
    label: t('breadcrumb.items.account-verify-email.label'),
    icon: t('breadcrumb.items.account-verify-email.icon'),
    current: true,
  },
])

const codeString = computed(() => code.value.join(''))

const schema = z.object({
  key: z.string()
    .min(1, $i18n.t('validation.required'))
    .length(6, t('validation.code.length')),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>): Promise<void> {
  try {
    loading.value = true
    hasError.value = false

    const data = await emailVerify({ key: event.data.key })

    if (data && [200, 401].includes(data.status)) {
      toast.add({
        title: t('auth.email.verified'),
        description: t('success.description'),
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })

      emit('emailVerify')
      await router.push(localePath('account'))
    }
  }
  catch (error) {
    hasError.value = true
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

watch(codeString, (newCode) => {
  if (newCode.length === 6) {
    onSubmit({ data: { key: newCode } } as FormSubmitEvent<Schema>)
  }
})

definePageMeta({
  layout: 'default',
  middleware: 'guest',
})
</script>

<template>
  <PageWrapper
    class="
      !mt-0 flex flex-col gap-0 p-0
      md:!mt-4
    "
  >
    <UBreadcrumb
      :items="items"
      :ui="{
        item: isMobileOrTablet ? 'text-primary-950 dark:text-primary-50' : 'text-primary-950 dark:text-primary-50',
        root: 'text-xs md:text-base',
      }"
      class="
        absolute z-10 mx-auto w-auto max-w-(--container-xl) bg-transparent !px-4
        !pt-2
        md:relative md:mb-5 md:w-full md:!pt-0
        dark:bg-transparent
      "
    />
    <UContainer
      class="
        mt-12 w-xl max-w-full
        sm:px-0
        md:mt-0
        lg:px-0
      "
    >
      <UPageCard variant="outline" class="w-full max-w-full">
        <div class="space-y-6">
          <div class="text-center">
            <div class="mb-4 inline-flex items-center justify-center">
              <UIcon
                name="i-heroicons-envelope-open" class="size-12 text-primary"
              />
            </div>
            <h1 class="text-2xl font-bold text-highlighted">
              {{ t('title') }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              {{ t('description') }}
            </p>
          </div>

          <UAlert
            v-if="hasError"
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-circle"
            :title="t('error.title')"
            :description="t('error.description')"
            close
            @update:open="hasError = false"
          />

          <UForm
            :schema="schema"
            :state="{ key: codeString }"
            class="space-y-6"
            @submit="onSubmit"
          >
            <UFormField
              name="key"
              :label="t('key')"
              :ui="{
                labelWrapper: 'items-center justify-center gap-2',
              }"
            >
              <div class="flex justify-center">
                <UPinInput
                  v-model="code"
                  :length="6"
                  type="text"
                  otp
                  size="xl"
                  placeholder="○"
                  :disabled="loading"
                  class="gap-2 pt-2"
                />
              </div>

              <template #hint>
                <div class="text-center text-xs text-muted">
                  ({{ t('code_hint') }})
                </div>
              </template>
            </UFormField>

            <UButton
              type="submit"
              :loading="loading"
              :disabled="codeString.length !== 6"
              block
              color="neutral"
              variant="subtle"
              size="lg"
              icon="i-heroicons-check-circle"
            >
              {{ $i18n.t('entry') }}
            </UButton>
          </UForm>

          <UAlert
            color="info"
            variant="soft"
            icon="i-heroicons-information-circle"
            :description="t('info_text')"
          />
        </div>
      </UPageCard>
    </UContainer>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επιβεβαίωση Email
  description: Θα πρέπει να επιβεβαιώσεις το email σου πριν συνεχίσεις.
  key: Κωδικός
  code_hint: Εισάγετε τον 6-ψήφιο κωδικό από το email σας
  info_text: Δεν έλαβες το email; Ελέγξε τον φάκελο spam ή ζήτησε νέο κωδικό.
  success:
    description: Το email σας επιβεβαιώθηκε επιτυχώς!
  error:
    title: Μη έγκυρος κωδικός
    description: Ο κωδικός που εισαγάγατε δεν είναι έγκυρος ή έχει λήξει.
  validation:
    code:
      length: Ο κωδικός πρέπει να έχει 6 ψηφία
  breadcrumb:
    items:
      account-login:
        label: Σύνδεση
        icon: i-heroicons-arrow-right-on-rectangle
      account-verify-email:
        label: Επιβεβαίωση
        icon: i-heroicons-envelope-open
</i18n>
