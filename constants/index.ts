import { FloorChoicesEnum, LocationChoicesEnum } from '~/types'

export const locationChoicesList = Object.keys(LocationChoicesEnum)
  .filter(key => isNaN(Number(key)))
  .map(key => ({
    name: key,
    value: LocationChoicesEnum[key as keyof typeof LocationChoicesEnum],
  }))

export const floorChoicesList = Object.keys(FloorChoicesEnum)
  .filter(key => isNaN(Number(key)))
  .map(key => ({
    name: key,
    value: FloorChoicesEnum[key as keyof typeof FloorChoicesEnum],
  }))

export const defaultSelectOptionChoose = 'choose'

export const AuthenticatedRoutePrefixes = [
  '/account/2fa/totp',
  '/account/2fa/recovery-codes',
  '/account/addresses',
  '/account/favourites',
  '/account/help',
  '/account/orders',
  '/account/providers',
  '/account/reviews',
  '/account/sessions',
  '/account/settings',
] as const

export const AuthenticatedRoutes = [
  '/account',
  '/account/2fa',
  '/account/email',
] as const

export const THEME_COLORS = {
  themeDark: '#1a202c',
  themeLight: '#ffffff',
  backgroundDark: '#ffffff',
  backgroundLight: '#1a202c',
} as const
