/**
 * The session, as a component on a page served from Nitro's cache may draw it.
 *
 * Those pages are rendered and replayed anonymously (`shared/constants/
 * prerender.ts`, "Anonymous-render contract"), and the visitor's session
 * arrives once the app has resolved (`app/plugins/setup.ts`). A component
 * hydrated lazily (`hydrate-on-visible`, `hydrateOnVisible` sections) hydrates
 * AFTER that, so reading the raw `loggedIn` in its first render draws the
 * signed-in markup over the anonymous HTML it was sent: a hydration mismatch
 * on every signed-in visit.
 *
 * `loggedIn` and `user` here stay the guest's until the component has
 * mounted, so the first render equals the server's and the signed-in parts
 * appear right after. Use it, not `useUserSession()`, for anything that
 * changes what such a component draws. A handler that runs on a click may
 * read either.
 *
 * It holds for what the component renders itself, not for a `Lazy…` child:
 * that is an async component, which hydrates after this one has mounted, when
 * the session is already the reader's. So a `Lazy…` element names the session
 * only in its own `v-if` / `v-else-if` (false on the first render, hence
 * created after mount and never hydrated), and a state that follows the
 * session is two such elements, not one whose props follow it.
 * `test/unit/source-rules/session-after-hydration.spec.ts` holds this for
 * every user of the accessor, directly or through a composable that calls it.
 */
export function useSessionAfterHydration() {
  const { loggedIn, user } = useUserSession()
  const mounted = useMounted()

  return {
    loggedIn: computed(() => mounted.value && loggedIn.value),
    user: computed(() => (mounted.value ? user.value : null)),
  }
}
