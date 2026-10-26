/** One way to answer a second-factor or re-authentication challenge. */
export interface MfaMethod {
  /** `<flow id>:<authenticator type>`, or the flow id alone for a flow with no types. */
  key: string
  id: Flow['id']
  /** The authenticator type, when the flow has them. */
  type?: AuthenticatorTypeValues
  path: FlowPathValue
}

/** A way to answer the second-factor challenge: always one authenticator type. */
export type MfaAuthenticateMethod = MfaMethod & { type: AuthenticatorTypeValues }

/**
 * The other factors a shopper in allauth's `mfa_authenticate` step can
 * use, in the order the shopper is offered them. The one on screen is
 * left out: it is this page. `next` is where the sign-in was going.
 */
export function useMfaAuthenticateMethods() {
  const router = useRouter()
  const localeRoute = useLocaleRoute()
  const authInfo = useAuthInfo()

  const flow = computed(() => authInfo?.pendingFlow)
  const next = router.currentRoute.value.query.next as string | undefined

  const alternatives = computed<MfaAuthenticateMethod[]>(() => {
    const pending = flow.value
    if (!pending?.types) return []
    return sortAuthenticatorTypes(pending.types)
      .map(type => ({
        key: `${pending.id}:${type}`,
        id: pending.id,
        type,
        path: pathForFlow(pending, type)!,
      }))
      .filter(method => localeRoute(method.path)?.path !== router.currentRoute.value.path)
  })

  return { flow, next, alternatives }
}

/**
 * Every way the shopper can re-authenticate, from the flows allauth lists
 * in the last auth response (`auth-state`): the password, and one entry
 * per authenticator type of the `mfa_reauthenticate` flow, sorted.
 * `others` leaves out the page the shopper is on (`routeName`).
 */
export function useMfaReauthenticationMethods() {
  const { $routeBaseName } = useNuxtApp()
  const route = useRoute()
  const router = useRouter()

  const routeName = computed(() => $routeBaseName(route))
  const authState = useState<AllAuthResponse | AllAuthResponseError>('auth-state')

  const next = router.currentRoute.value.query.next as string | undefined

  const flows = computed(() => {
    const state = authState.value
    if (!state) return []
    return 'data' in state && 'flows' in state.data ? state.data.flows || [] : []
  })

  const methods = computed<MfaMethod[]>(() => flows.value.flatMap((flow): MfaMethod[] => {
    if (flow.id !== Flows.MFA_REAUTHENTICATE) {
      return [{ key: flow.id, id: flow.id, path: pathForFlow(flow)! }]
    }
    return sortAuthenticatorTypes(flow.types).map(type => ({
      key: `${flow.id}:${type}`,
      id: flow.id,
      type,
      path: pathForFlow(flow, type)!,
    }))
  }))

  const others = computed(() => methods.value.filter(method => method.path !== routeName.value))

  return { next, routeName, methods, others }
}
