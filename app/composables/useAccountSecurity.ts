/** A second factor the store can offer, as allauth names it. */
export type SecondFactorType = 'totp' | 'webauthn' | 'recovery_codes'

/**
 * What the account's Security page knows about the shopper's sign-in
 * protection, read from the auth store: which second factors the store
 * supports, which are on, and whether the shopper has a password.
 *
 * One reading for every design: the default Security page and webside's
 * both draw this, so a rule here (recovery codes wait for another
 * factor, a failed read is not "off") lands in both. `load()` fetches the
 * authenticators; the page awaits it so the server render shows them.
 */
export function useAccountSecurity() {
  const authStore = useAuthStore()
  const { config, authenticators, totpAuthenticator, recoveryCodesAuthenticator, hasCurrentPassword } = storeToRefs(authStore)

  const supportedFactors = computed<SecondFactorType[]>(() => config.value?.mfa?.supported_types ?? [])

  const supports = (type: SecondFactorType) => supportedFactors.value.includes(type)

  const passkeys = computed(() =>
    (authenticators.value ?? []).filter(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN),
  )

  const hasSecondFactor = computed(() => Boolean(totpAuthenticator.value) || passkeys.value.length > 0)

  /** The factors that are on, in the order the page names them. */
  const activeFactors = computed(() => {
    const active: Array<'totp' | 'webauthn'> = []
    if (totpAuthenticator.value) active.push('totp')
    if (passkeys.value.length > 0) active.push('webauthn')
    return active
  })

  return {
    supportedFactors,
    supports,
    authenticators,
    totpAuthenticator,
    recoveryCodesAuthenticator,
    passkeys,
    hasSecondFactor,
    activeFactors,
    hasCurrentPassword,
    load: () => authStore.setupAuthenticators(),
  }
}
