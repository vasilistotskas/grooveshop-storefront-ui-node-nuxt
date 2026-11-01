/**
 * The page builder's staff sign-in, for `/_builder` (browser only).
 *
 * `open()` signs in with the single-use `?ticket=` Django's admin put on the
 * address, or, with none, asks who is already signed in (a reload, a second
 * tab). The ticket leaves the address bar before anything else: it must not
 * outlive its one use in the history, a reload or a `Referer`. The session
 * itself lives in a cookie the server seals and the browser cannot read
 * (`server/utils/builderSession.ts`); this holds only who it is.
 */
export function useBuilderSession() {
  const route = useRoute()
  const router = useRouter()

  const status = ref<BuilderSessionStatus>('loading')
  const info = ref<BuilderSessionInfo>()

  async function open(): Promise<void> {
    const { ticket, ...query } = route.query
    try {
      if (typeof ticket === 'string') {
        await router.replace({ query })
        info.value = await $api('/api/builder/session', { method: 'POST', body: { ticket } })
      }
      else {
        info.value = await $api('/api/builder/session')
      }
      status.value = 'signedIn'
    }
    catch (error) {
      status.value = builderSessionFailure(error)
      if (status.value === 'error') {
        log.error({ action: 'builder:session', error })
      }
    }
  }

  async function signOut(): Promise<void> {
    try {
      await $api('/api/builder/session', { method: 'DELETE' })
      info.value = undefined
      status.value = 'signedOut'
    }
    catch (error) {
      log.error({ action: 'builder:sign_out', error })
      status.value = 'error'
    }
  }

  return { status, info, open, signOut }
}
