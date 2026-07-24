import type { RouteMapI18n } from 'vue-router'

export const isRouteProtected = (route: string) => {
  return AuthenticatedRoutesSet.has(route as keyof RouteMapI18n)
}

export const isAuthFlowRoute = (route: string) => {
  return AuthFlowRoutesSet.has(route as keyof RouteMapI18n)
}
