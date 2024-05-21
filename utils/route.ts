import { AuthenticatedRoutePrefixes, AuthenticatedRoutes } from '~/constants'

export const isRouteProtected = (route: string) => {
  return AuthenticatedRoutePrefixes.some(prefix => route.startsWith(prefix)) || AuthenticatedRoutes.includes(route)
}
