/**
 * A page that makes sense only in one step of an allauth flow sends
 * everyone else to the home page. Awaited in `<script setup>`.
 *
 * `useAuthEventGuard(event)`: the auth plugin's last event (`authEvent`)
 * is `event`. While it is still unset the plugin has not decided yet, and
 * the page stays.
 */
export async function useAuthEventGuard(expected: AuthChangeEventType) {
  const authEvent = useState<AuthChangeEventType>('authEvent')
  const localePath = useLocalePath()

  if (authEvent.value !== undefined && authEvent.value !== expected) {
    await navigateTo(localePath('index'))
  }
}

/** `usePendingFlowGuard(id)`: allauth's pending flow is the one named `id`. */
export async function usePendingFlowGuard(id: Flow['id']) {
  const authInfo = useAuthInfo()
  const localePath = useLocalePath()

  if (authInfo?.pendingFlow?.id !== id) {
    await navigateTo(localePath('index'))
  }
}
