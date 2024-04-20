<script lang="ts" setup>
const { session } = useUserSession()
const isTotpActive = session.value?.totpActive

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
    <PageTitle :text="$t('pages.auth.security.mfa.title')" class="capitalize" />
    <AuthSecurityNavbar />
    <PageBody>
      <div
        class="
          container-2xs bg-primary-100 grid items-center justify-center
          justify-items-center gap-4 rounded border border-gray-900/10 !p-4

          dark:bg-primary-900 dark:border-gray-50/[0.2]

          md:px-6
        "
      >
        <UIcon
          name="i-heroicons-shield-check"
          class="mx-auto h-24 w-24 text-secondary"
        />
        <template v-if="isTotpActive">
          <UButton
            :to="'/auth/security/mfa/recovery-codes'"
            variant="link"
            color="opposite"
            size="xl"
            :label="$t('pages.auth.security.mfa.recovery.codes.link')"
          />
          <UButton
            :to="'/auth/security/mfa/recovery-codes/generate'"
            variant="link"
            color="opposite"
            size="xl"
            :label="$t('pages.auth.security.mfa.recovery.codes.generate.link')"
          />
          <AuthMfaTotpDeactivateButton />
        </template>
        <template v-else>
          <UButton
            :to="'/auth/security/mfa/totp/activate'"
            variant="link"
            color="opposite"
            size="xl"
            :label="$t('pages.auth.security.mfa.totp.activate.link')"
          />
        </template>
      </div>
    </PageBody>
  </PageWrapper>
</template>
