<script lang="ts" setup>
const config = useRuntimeConfig()
const { t } = useStoreI18n('components/variants/webside/Account/Login/Form')
const localePath = useLocalePath()
const { isMobileOrTablet } = useDevice()
const tenantStore = useTenantStore()
const isPlatform = useIsPlatformTenant()

const { status } = storeToRefs(useAuthStore())
const { hasProviders } = useSocialProviders()

const { schema, state, isSubmitting, onSubmit } = useLogin()
</script>

<template>
  <section class="relative grid">
    <!-- The phone's hero is an <img>, not a CSS background set from a
         computed URL: the browser finds it in the server's HTML, so it can
         be the LCP at high priority (it was undiscoverable until JS ran). -->
    <div
      v-if="isMobileOrTablet"
      class="absolute top-[-1px] z-0 h-64 w-full overflow-hidden"
    >
      <NuxtImg
        src="/img/login-background.png"
        alt=""
        :width="400"
        :height="256"
        fit="contain"
        loading="eager"
        fetchpriority="high"
        :preload="{ fetchPriority: 'high' }"
        class="size-full object-cover object-center"
      />
    </div>
    <UForm
      id="loginForm"
      ref="loginForm"
      :schema="schema"
      :state="state"
      class="
        z-10 container mx-auto px-4 !pt-12 !pb-6
        md:!p-0
      "
      @error="scrollToFirstFormError"
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
              <!-- The platform's auth mark is SQUARE (1000x1000).
                   Feeding it through TenantLogo, whose default asset is
                   the 580x120 wordmark, letterboxed a wide image inside
                   a square box (objectFit: contain) — so keep the square
                   asset for the platform and give tenants their own
                   logo at its natural wordmark aspect. -->
              <NuxtImg
                v-if="isPlatform"
                :src="'/img/logo-border.png'"
                :width="isMobileOrTablet ? 100 : 140"
                :height="isMobileOrTablet ? 100 : 140"
                :alt="''"
                quality="90"
              />
              <TenantLogo
                v-else
                :width="isMobileOrTablet ? 160 : 220"
                :height="isMobileOrTablet ? 88 : 110"
                img-class="object-center"
              />
              <span class="sr-only">
                {{ t('logo_alt', { appTitle: tenantStore.storeName || config.public.appTitle }) }}
              </span>
            </div>
            <UFormField
              :label="t('email.label')"
              name="email"
              :required="true"
              size="xl"
            >
              <UInput
                v-model="state.email"
                type="email"
                autocomplete="email"
                inputmode="email"
                icon="i-heroicons-envelope"
                class="w-full"
                size="xl"
              />
            </UFormField>

            <UFormField
              :label="t('password.label')"
              name="password"
              :required="true"
              size="xl"
            >
              <WebsideFormPasswordInput
                v-model="state.password"
                autocomplete="current-password"
                icon="i-heroicons-lock-closed"
                size="xl"
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
              <WebsideWebAuthnLoginButton />
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
                v-if="hasProviders"
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
                  <WebsideAccountProviderList />
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
