<script lang="ts" setup>
const { session } = useUserSession()
const isTotpActive = session.value?.totpActive

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-4 md:gap-8">
    <PageHeader>
      <PageTitle
        :text="$t('pages.auth.security.mfa.title')"
        class="capitalize"
      />
    </PageHeader>
    <AuthSecurityNavbar />
    <PageBody>
      <div
        class="container-xxs grid items-center justify-center justify-items-center gap-4 rounded border border-gray-900/10 bg-white p-4 dark:border-gray-50/[0.2] dark:bg-zinc-800 md:px-6"
      >
        <UIcon
          name="i-heroicons-shield-check"
          class="text-primary-500 mx-auto h-24 w-24"
        />
        <template v-if="isTotpActive">
          <AuthMfaTotpDeactivateButton />
          <UButton :to="'/auth/security/mfa/recovery-codes'" color="white">
            {{ $t('pages.auth.security.mfa.recovery.codes.link') }}
          </UButton>
          <UButton
            :to="'/auth/security/mfa/recovery-codes/generate'"
            color="white"
          >
            {{ $t('pages.auth.security.mfa.recovery.codes.generate.link') }}
          </UButton>
        </template>
        <template v-else>
          <UButton :to="'/auth/security/mfa/totp/activate'" color="white">
            {{ $t('pages.auth.security.mfa.totp.activate.link') }}
          </UButton>
        </template>
      </div>
    </PageBody>
  </PageWrapper>
</template>
