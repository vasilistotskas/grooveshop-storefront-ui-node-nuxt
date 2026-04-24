<script lang="ts" setup>
import * as z from 'zod'
import type { FormSubmitEvent } from '#ui/types'

const config = useRuntimeConfig()
const { t } = useI18n()
const localePath = useLocalePath()
const { login } = useAllAuthAuthentication()
const router = useRouter()
const cartStore = useCartStore()
const { refreshCart } = cartStore
const { isMobileOrTablet } = useDevice()
const img = useImage()
const tenantStore = useTenantStore()

const authStore = useAuthStore()
const { session, status, hasSocialAccountProviders } = storeToRefs(authStore)

const isSubmitting = ref(false)

const schema = z.object({
  email: z.email({
    error: issue => issue.input === undefined
      ? t('validation.required')
      : t('validation.email.valid'),
  }),
  password: z.string({ error: issue => issue.input === undefined
    ? t('validation.required')
    : t('validation.string.invalid') }),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: undefined,
  password: undefined,
})

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
  isSubmitting.value = true
  try {
    const currentPath = router.currentRoute.value.path
    const currentQuery = router.currentRoute.value.query

    if (!currentQuery.next) {
      await router.replace({ query: { next: currentPath } })
    }

    const response = await login({
      email: event.data.email,
      password: event.data.password,
    })

    session.value = response?.data
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    await refreshCart()
    isSubmitting.value = false
  }
}

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
      id="loginForm"
      ref="loginForm"
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
                inputmode="email"
                class="w-full"
                size="lg"
              />
            </UFormField>

            <UFormField
              :label="t('password.label')"
              name="password"
              :required="true"
              size="lg"
            >
              <FormPasswordInput
                v-model="state.password"
                autocomplete="current-password"
                size="lg"
              />
            </UFormField>

            <UButton
              :label="t('submit')"
              :loading="isSubmitting"
              block
              size="xl"
              type="submit"
              variant="solid"
              color="secondary"
            />
          </div>
          <div
            class="grid gap-4"
          >
            <template v-if="status.config === 'success'">
              <div
                class="
                  flex items-center
                  before:mt-0.5 before:flex-1 before:border-t
                  before:border-neutral-300
                  after:mt-0.5 after:flex-1 after:border-t
                  after:border-neutral-300
                "
              >
                <p
                  class="
                    mx-4 text-center font-semibold text-primary-950
                    dark:text-primary-50
                  "
                >
                  {{ t('or') }}
                </p>
              </div>
              <WebAuthnLoginButton />
              <div
                class="
                  flex flex-col items-center gap-2 py-4
                  sm:flex-col
                "
              >
                <UButton
                  :label="t('use.code')"
                  :to="localePath('account-login-code')"
                  class="p-0 font-semibold"
                  color="secondary"
                  size="md"
                  type="button"
                  variant="link"
                />
                <UButton
                  class="p-0 font-semibold"
                  :label="t('forgot.password.reset')"
                  :to="localePath('account-password-reset')"
                  size="md"
                  color="secondary"
                  type="button"
                  variant="link"
                />
                <div
                  class="flex items-center gap-2"
                >
                  <span
                    class="text-sm font-semibold"
                  >{{
                    t('no.account')
                  }}</span>

                  <UButton
                    class="p-0 font-semibold underline"
                    :label="t('register')"
                    :to="localePath('account-signup')"
                    size="lg"
                    color="secondary"
                    type="button"
                    variant="link"
                  />
                </div>
              </div>
              <div
                v-if="hasSocialAccountProviders"
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
            </template>
            <div
              v-else-if="status.config === 'pending'"
              class="grid gap-4"
            >
              <USkeleton
                class="h-6 w-full"
              />
              <USkeleton
                class="h-9 w-full"
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
  social:
    title: Ή συνδέσου μέσω ενός τρίτου παρόχου
  email:
    label: Email
    validation:
      email: Το email πρέπει να είναι έγκυρη διεύθυνση email
  password:
    label: Κωδικός πρόσβασης
    toggle: Δείξε τον κωδικό
  use:
    code: Σύνδεση με κωδικό μιας χρήσης
  forgot:
    password:
      reset: Ξέχασες τον κωδικό σου;
  submit: Σύνδεση
  or: ή
  no:
    account: Δεν έχεις λογαριασμό;
</i18n>
