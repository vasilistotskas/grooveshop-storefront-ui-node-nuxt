/**
 * Whether the phone's tab bar carries the cart on the page shown: the store
 * shows a tab bar (`mobileBottomNav`) and the page is not an account page,
 * whose tab bar leaves the cart out for the account's own tabs. ONE answer
 * for the layout, which tells the tab bar whether to draw its Cart tab, and
 * for a header that draws its own cart button only when the tab bar does
 * not, so a shopper always has one way to the cart.
 */
export function useTabBarCart() {
  const route = useRoute()
  const { $routeBaseName } = useNuxtApp()
  const tabBarShown = useStorePreference('mobileBottomNav')

  const onAccountPage = computed(() => isAccountRouteName($routeBaseName(route)))

  return computed(() => tabBarShown.value && !onAccountPage.value)
}
