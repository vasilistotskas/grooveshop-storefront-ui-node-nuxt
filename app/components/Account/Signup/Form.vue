<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const config = useRuntimeConfig()
const { signup } = useAllAuthAuthentication()
const authStore = useAuthStore()
const { hasSocialAccountProviders, status } = storeToRefs(authStore)

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()
const img = useImage()
const tenantStore = useTenantStore()

const selected = ref(false)
const isSubmitting = ref(false)

const schema = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('email.validation.email'),
  }),
  password: z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : undefined,
  }).min(8, {
    error: issue => t('password1.validation.min', { min: issue.minimum }),
  }),
  password2: z.string({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : undefined,
  }),
}).refine(data => data.password === data.password2, {
  error: t('password2.validation.match'),
  path: ['password2'],
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined,
  password2: undefined,
})

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isSubmitting.value = true
  try {
    await signup({ email: event.data.email, password: event.data.password })
    toast.add({
      title: t('auth.signup.success'),
      color: 'success',
    })
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    isSubmitting.value = false
  }
}

const submitButtonDisabled = computed(() => {
  return !selected.value || isSubmitting.value
})

const backgroundImage = computed(() => {
  return img(
    '/img/login-background.png',
    {
      width: 400,
      height: 256,
      fit: 'contain',
    },
  )
})
</script>

<template>
  <section class="relative grid">
    <div
      v-if="isMobileOrTablet"
      class="absolute top-[-1px] z-0 h-64 w-full bg-center"
      :style="isMobileOrTablet ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover' } : ''"
    />
    <UForm
      id="SignupForm"
      :schema="schema"
      :state="state"
      class="
        z-10 container mx-auto px-4 !pt-12 !pb-6
        md:!p-0
      "
      @submit="onSubmit"
    >
      <div
        class="h-full flex-wrap items-center justify-center rounded-lg p-0"
      >
        <div class="relative grid w-full gap-4">
          <div
            class="
              grid gap-6 rounded-lg bg-primary-100 px-4 py-8 shadow-lg
              md:bg-transparent md:!p-0 md:shadow-none
              dark:bg-primary-900 dark:md:bg-transparent
            "
          >
            <div class="grid content-evenly items-center justify-center gap-1">
              <NuxtImg
                :style="{ objectFit: 'contain' }"
                :src="'/img/logo-border.png'"
                :width="isMobileOrTablet ? 100 : 140"
                :height="isMobileOrTablet ? 100 : 140"
                :alt="t('logo_alt', { appTitle: tenantStore.storeName || config.public.appTitle })"
                quality="80"
              />
            </div>
            <UFormField
              :label="t('email.label')"
              name="email"
              :required="true"
              size="lg"
            >
              <UInput
                v-model="state.email"
                type="email"
                autocomplete="email"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="t('password1.label')"
              name="password"
              :required="true"
              size="lg"
            >
              <FormPasswordInput
                v-model="state.password"
                autocomplete="new-password"
                size="lg"
              />
              <FormPasswordStrengthMeter :password="state.password ?? ''" />
            </UFormField>

            <UFormField
              :label="t('password2.label')"
              name="password2"
              :required="true"
              size="lg"
            >
              <FormPasswordInput
                v-model="state.password2"
                autocomplete="new-password"
                size="lg"
              />
            </UFormField>

            <div class="flex items-center gap-2">
              <UCheckbox
                v-model="selected"
                name="consent"
                icon="i-heroicons-check"
                :color="'info'"
                :ui="{
                  label: 'text-sm font-medium',
                }"
              >
                <template #label>
                  <div class="flex gap-1">
                    <span>{{ t('i_approve') }}</span>
                    <UButton
                      :label="t('terms')"
                      :to="localePath('terms-of-use')"
                      color="secondary"
                      type="button"
                      variant="link"
                      target="_blank"
                      :ui="{
                        base: 'p-0',
                      }"
                    />
                  </div>
                </template>
              </UCheckbox>
            </div>

            <UButton
              :disabled="submitButtonDisabled"
              :loading="isSubmitting"
              :label="t('submit')"
              block
              size="xl"
              type="submit"
              variant="solid"
              color="secondary"
            />

            <div
              class="
                flex flex-col items-center gap-2
                sm:flex-row sm:items-center
                md:justify-between
              "
            >
              <UButton
                :label="t('passkey_login')"
                :to="localePath('account-signup-passkey')"
                class="p-0 font-semibold"
                color="secondary"
                size="md"
                type="button"
                variant="link"
              />
              <div class="flex items-center gap-2">
                <span
                  class="text-sm font-semibold"
                >{{
                  t('already_have_account')
                }}</span>
                <UButton
                  class="p-0 font-semibold underline"
                  :label="t('login')"
                  :to="localePath('account-login')"
                  size="lg"
                  color="secondary"
                  type="button"
                  variant="link"
                />
              </div>
            </div>
          </div>
          <div class="grid gap-4">
            <div
              v-if="hasSocialAccountProviders && status.config === 'success'"
              class="grid gap-4"
            >
              <div
                class="
                  my-2 flex items-center
                  before:mt-0.5 before:flex-1 before:border-t
                  before:border-neutral-300
                  after:mt-0.5 after:flex-1 after:border-t
                  after:border-neutral-300
                "
              >
                <p
                  class="mx-4 text-center font-semibold"
                >
                  {{ t('or') }}
                </p>
              </div>
              <div
                class="grid items-center justify-center gap-4"
              >
                <p
                  class="
                    text-sm font-semibold text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ t('social.title') }}
                </p>
                <div class="flex items-center justify-center gap-4">
                  <AccountProviderList />
                </div>
              </div>
            </div>
            <div
              v-else-if="status.config === 'pending'"
              class="grid gap-4"
            >
              <USkeleton
                class="my-2 h-6 w-full"
              />
              <USkeleton
                class="h-20 w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </UForm>
  </section>
</template>

<i18n lang="yaml">
el:
  logo_alt: "Λογότυπο {appTitle}"
  login: Σύνδεση
  or: ή
  passkey_login: Εγγραφή με κωδικό μιας χρήσης
  i_approve: Αποδέχομαι τους
  terms: όρους χρήσης
  email:
    label: Email
    validation:
      email: Το email πρέπει να είναι έγκυρη διεύθυνση email
  password1:
    label: Κωδικός πρόσβασης
    show: Δείξε τον κωδικό
    validation:
      min: Ο κωδικός πρόσβασης πρέπει να αποτελείται από τουλάχιστον {min}
        χαρακτήρες
  password2:
    label: Επιβεβαίωση κωδικού πρόσβασης
    show: Δείξε τον κωδικό
    validation:
      min: Η επιβεβαίωση κωδικού πρόσβασης πρέπει να αποτελείται από τουλάχιστον
        {min} χαρακτήρες
      match: Η επιβεβαίωση κωδικού πρόσβασης πρέπει να ταιριάζει με τον κωδικό
        πρόσβασης
  submit: Εγγραφή
  already_have_account: Έχεις ήδη λογαριασμό?
  social:
    title: Ή εγγράψου μέσω ενός τρίτου παρόχου
</i18n>
