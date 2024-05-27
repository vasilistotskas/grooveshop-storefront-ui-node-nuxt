<script lang="ts" setup>
import { AuthenticatorType } from '~/types/all-auth'

const localePath = useLocalePath()
const { getAuthenticators } = useAllAuthAccount()

const { data } = await getAuthenticators()

const totp = computed(() => {
  return data.value?.data.find(authenticator => authenticator.type === AuthenticatorType.TOTP)
})

const recoveryCodes = computed(() => {
  return data.value?.data.find(authenticator => authenticator.type === AuthenticatorType.RECOVERY_CODES)
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle
      :text="$t('pages.account.2fa.title')" class="text-center capitalize"
    />
    <PageBody>
      <div class="grid items-center justify-center">
        <p
          class="
            text-primary-950 text-center

            dark:text-primary-50
          "
        >
          {{ $t('pages.account.2fa.authenticator.app') }}
        </p>
        <div
          v-if="totp" class="
            grid items-center justify-center justify-items-center gap-4
          "
        >
          <p
            class="
              text-primary-950 text-center

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.2fa.active') }}
          </p>
          <UButton
            :label="$t('common.deactivate')"
            :to="localePath('/account/2fa/totp/deactivate')"
            color="primary"
            size="xl"
          />
        </div>
        <div
          v-else class="
            grid items-center justify-center justify-items-center gap-4
          "
        >
          <p
            class="
              text-primary-950 text-center

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.2fa.inactive') }}
          </p>
          <UButton
            :label="$t('common.activate')"
            :to="localePath('/account/2fa/totp/activate')"
            color="primary"
            size="xl"
          />
        </div>
      </div>
      <div class="grid items-center justify-center">
        <p
          class="
            text-primary-950 text-center

            dark:text-primary-50
          "
        >
          {{ $t('pages.account.2fa.recovery-codes.title') }}
        </p>
        <div
          v-if="!recoveryCodes" class="
            grid items-center justify-center justify-items-center gap-4
          "
        >
          <p
            class="
              text-primary-950 text-center

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.2fa.recovery-codes.unset') }}
          </p>
          <UButton
            :label="$t('common.generate')"
            :to="localePath('/account/2fa/recovery-codes/generate')"
            color="primary"
            size="xl"
          />
        </div>
        <div
          v-else class="
            grid items-center justify-center justify-items-center gap-4
          "
        >
          <p
            class="
              text-primary-950 text-center

              dark:text-primary-50
            "
          >
            {{ $t('pages.account.2fa.recovery-codes.info', {
              unused_code_count: recoveryCodes.unused_code_count,
              total_code_count: recoveryCodes.total_code_count,
            }) }}
          </p>
          <UButton
            :label="$t('common.view')"
            :to="localePath('/account/2fa/recovery-codes')"
            color="primary"
            size="xl"
          />
          <UButton
            :label="$t('common.regenerate')"
            :to="localePath('/account/2fa/recovery-codes/generate')"
            color="primary"
            size="xl"
          />
        </div>
      </div>
    </PageBody>
  </PageWrapper>
</template>
