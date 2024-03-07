<script lang="ts" setup>
import { z } from 'zod'

import { GlobalEvents } from '~/events/global'

const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const { fetch } = useUserSession()
const { login, loginWithProvider, userAccountDetails } = useAuth()
const { totpActive } = useAuthMfa()
const userStore = useUserStore()
const cartStore = useCartStore()
const { fetchCart } = cartStore

const { setAccountState } = userStore

const ZodLogin = z.object({
	email: z.string().email(),
	password: z.string()
})

const validationSchema = toTypedSchema(ZodLogin)

const { defineField, handleSubmit, errors, isSubmitting } = useForm({
	validationSchema
})

const [email, emailProps] = defineField('email', {
	validateOnModelUpdate: true
})
const [password, passwordProps] = defineField('password', {
	validateOnModelUpdate: true
})

const showPassword = ref(false)
const rememberMe = ref(false)
const loading = ref(false)

const bus = useEventBus<string>(GlobalEvents.GENERIC_MODAL)

const onSubmit = handleSubmit((values) => {
	loading.value = true
	login({
		email: values.email,
		password: values.password,
		rememberMe: rememberMe.value
	})
		.then(async () => {
			await fetch()
			const { data: accountDetails } = await userAccountDetails()
			if (accountDetails.value) {
				setAccountState(accountDetails.value)
			}
			await Promise.all([totpActive(), fetchCart()])
			const to = route.query.redirect?.toString() || '/account'
			await navigateTo(to)
		})
		.catch((error) => {
			toast.add({
				title: error.data.data?.nonFieldErrors[0] || t('common.auth.login.error'),
				color: 'red'
			})
		})
		.finally(async () => {
			loading.value = false
			bus.emit('fallbackModalClose')
			await fetch()
		})
})

const ClientOnlyFallback = resolveComponent('ClientOnlyFallback')
</script>

<template>
  <section class="grid">
    <Component
      :is="loading ? ClientOnlyFallback : 'form'"
      :id="loading ? undefined : 'loginForm'"
      ref="loginForm"
      class="container-xs p-0 md:px-6"
      :height="loading ? '484px' : undefined"
      :width="loading ? '100%' : undefined"
      :show-animation="loading ? false : undefined"
      :spinner="
        loading
          ? {
            enabled: true,
            fontSize: '5rem'
          }
          : undefined
      "
      :modal="loading"
      :name="loading ? undefined : 'loginForm'"
      @submit="onSubmit"
    >
      <div
        v-if="!loading"
        class="flex h-full flex-wrap items-center justify-center rounded-[0.5rem] border border-gray-900/10 bg-white p-4 shadow-[0_4px_9px_-4px_#0000000d] dark:border-gray-50/[0.2] dark:bg-zinc-800 dark:shadow-[0_4px_9px_-4px_#0000000d] md:p-8 lg:justify-between"
      >
        <div class="relative grid w-full gap-4">
          <div class="grid content-evenly items-start">
            <label class="text-primary-700 dark:text-primary-100" for="email">{{
              $t('pages.auth.login.form.email.label')
            }}</label>
            <FormTextInput
              id="email"
              v-model="email"
              :bind="emailProps"
              class="text-primary-700 dark:text-primary-100"
              name="email"
              type="email"
              autocomplete="email"
              :required="true"
            />
            <span v-if="errors.email" class="relative px-4 py-3 text-sm text-red-600">{{
              errors.email
            }}</span>
          </div>

          <div class="grid content-evenly items-start">
            <label class="text-primary-700 dark:text-primary-100" for="password">{{
              $t('pages.auth.login.form.password.label')
            }}</label>
            <div class="relative grid items-center gap-2">
              <FormTextInput
                id="password"
                v-model="password"
                :bind="passwordProps"
                class="text-primary-700 dark:text-primary-100"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :required="true"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 transform"
                :aria-label="$t('pages.auth.login.form.password.toggle')"
                @click="showPassword = !showPassword"
              >
                <IconFa6Solid:eye v-if="!showPassword" />
                <IconFa6Solid:eyeSlash v-else />
              </button>
            </div>
            <span
              v-if="errors.password"
              class="relative px-4 py-3 text-sm text-red-600"
            >{{ errors.password }}</span>
          </div>

          <div class="flex items-center justify-between">
            <div class="0.125rem] block min-h-[1.5rem] pl-[1.5rem]">
              <input
                id="checkbox"
                v-model="rememberMe"
                class="checked:border-primary checked:bg-primary dark:checked:border-primary dark:checked:bg-primary relative float-left -ml-[1.5rem] mr-[6px] h-[1.125rem] w-[1.125rem] appearance-none rounded-[0.25rem] border-[0.125rem] border-solid border-neutral-300 outline-none before:pointer-events-none before:absolute before:h-[0.875rem] before:w-[0.875rem] before:scale-0 before:rounded-full before:bg-transparent before:opacity-0 before:shadow-[0px_0px_0px_13px_transparent] before:content-[''] checked:before:opacity-[0.16] checked:after:absolute checked:after:-mt-px checked:after:ml-[0.25rem] checked:after:block checked:after:h-[0.8125rem] checked:after:w-[0.375rem] checked:after:rotate-45 checked:after:border-[0.125rem] checked:after:border-l-0 checked:after:border-t-0 checked:after:border-solid checked:after:border-white checked:after:bg-transparent checked:after:content-[''] hover:cursor-pointer hover:before:opacity-[0.04] hover:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)] focus:shadow-none focus:transition-[border-color_0.2s] focus:before:scale-100 focus:before:opacity-[0.12] focus:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)] focus:before:transition-[box-shadow_0.2s,transform_0.2s] focus:after:absolute focus:after:z-[1] focus:after:block focus:after:h-[0.875rem] focus:after:w-[0.875rem] focus:after:rounded-[0.125rem] focus:after:content-[''] checked:focus:before:scale-100 checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca] checked:focus:before:transition-[box-shadow_0.2s,transform_0.2s] checked:focus:after:-mt-px checked:focus:after:ml-[0.25rem] checked:focus:after:h-[0.8125rem] checked:focus:after:w-[0.375rem] checked:focus:after:rotate-45 checked:focus:after:rounded-none checked:focus:after:border-[0.125rem] checked:focus:after:border-l-0 checked:focus:after:border-t-0 checked:focus:after:border-solid checked:focus:after:border-white checked:focus:after:bg-transparent dark:border-neutral-600 dark:focus:before:shadow-[0px_0px_0px_13px_rgba(255,255,255,0.4)] dark:checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca]"
                type="checkbox"
              >
              <label
                class="inline-block pl-[0.15rem] text-sm hover:cursor-pointer md:text-base"
                for="checkbox"
              >
                {{ $t('pages.auth.login.form.remember') }}
              </label>
            </div>

            <Anchor
              :to="'/auth/password/reset'"
              :title="$t('pages.auth.login.form.forgot.password.reset')"
              :text="$t('pages.auth.login.form.forgot.password.reset')"
              class="text-primary hover:text-primary-600 focus:text-primary-600 active:text-primary-700 dark:text-primary-400 dark:hover:text-primary-500 dark:focus:text-primary-500 dark:active:text-primary-600 text-sm transition duration-150 ease-in-out md:text-base"
            />
          </div>

          <button
            type="submit"
            class="bg-primary hover:bg-primary-600 focus:bg-primary-600 active:bg-primary-700 inline-block w-full rounded px-7 pb-2.5 pt-3 text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
            :disabled="isSubmitting"
            :aria-busy="isSubmitting"
          >
            {{ $t('pages.auth.login.form.submit') }}
          </button>

          <div
            class="my-4 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-neutral-300 after:mt-0.5 after:flex-1 after:border-t after:border-neutral-300"
          >
            <p class="mx-4 text-center font-semibold dark:text-neutral-200">
              {{ $t('pages.auth.login.form.or') }}
            </p>
          </div>

          <button
            class="bg-info hover:bg-info-600 focus:bg-info-600 active:bg-info-700 flex w-full items-center justify-center rounded px-7 pb-2.5 pt-3 text-center text-sm font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#54b4d3] transition duration-150 ease-in-out hover:shadow-[0_8px_9px_-4px_rgba(84,180,211,0.3),0_4px_18px_0_rgba(84,180,211,0.2)] focus:shadow-[0_8px_9px_-4px_rgba(84,180,211,0.3),0_4px_18px_0_rgba(84,180,211,0.2)] focus:outline-none focus:ring-0 active:shadow-[0_8px_9px_-4px_rgba(84,180,211,0.3),0_4px_18px_0_rgba(84,180,211,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(84,180,211,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(84,180,211,0.2),0_4px_18px_0_rgba(84,180,211,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(84,180,211,0.2),0_4px_18px_0_rgba(84,180,211,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(84,180,211,0.2),0_4px_18px_0_rgba(84,180,211,0.1)]"
            style="background-color: #ea4335"
            type="button"
            data-te-ripple-init
            data-te-ripple-color="light"
            @click="() => loginWithProvider('google')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="mr-2 h-3.5 w-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"
              />
            </svg>
            {{ $t('pages.auth.login.form.google') }}
          </button>

          <div class="flex items-center justify-end gap-2">
            <span class="text-primary-700 dark:text-primary-100 text-sm">{{
              $t('pages.auth.login.form.no.account')
            }}</span>
            <Anchor
              class="flex items-center self-center text-[1.5rem] text-base hover:text-slate-900 hover:no-underline hover:dark:text-white"
              :title="$t('pages.auth.registration.title')"
              :text="$t('pages.auth.registration.title')"
              :to="'/auth/registration'"
            />
          </div>
        </div>
      </div>
    </Component>
  </section>
</template>
