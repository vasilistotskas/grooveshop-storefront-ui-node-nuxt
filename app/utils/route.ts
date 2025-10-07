import type { RouteNamedMapI18n } from 'vue-router/auto-routes'

export const isRouteProtected = (route: keyof RouteNamedMapI18n) => {
  return AuthenticatedRoutesSet.has(route)
}
