export default function () {
  const auth = useState<AllAuthResponse | AllAuthResponseError>('auth-state')

  const isAuthenticated = computed(() => authInfo(auth.value).isAuthenticated)
  const requiresReauthentication = computed(() => authInfo(auth.value).requiresReauthentication)
  const user = computed(() => authInfo(auth.value).user)
  const pendingFlow = computed(() => authInfo(auth.value).pendingFlow)

  // reactive() auto-unwraps the computed refs so callers use authInfo.isAuthenticated
  // (not authInfo.isAuthenticated.value) while still being reactive.
  return reactive({ isAuthenticated, requiresReauthentication, user, pendingFlow })
}
