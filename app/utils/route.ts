import type { RouteNamedMapI18n } from 'vue-router/auto-routes'

export const isRouteProtected = (route: string) => {
  return AuthenticatedRoutesSet.has(route as keyof RouteNamedMapI18n)
}
