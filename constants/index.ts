import {
  ZodFloorChoicesEnum,
  ZodLocationChoicesEnum,
} from '~/types'

export const locationChoicesList = Object.keys(
  ZodLocationChoicesEnum.Values,
).filter((element) => {
  return isNaN(Number(element))
})

export const floorChoicesList = Object.keys(ZodFloorChoicesEnum.Values).filter(
  (element) => {
    return isNaN(Number(element))
  },
)

export const defaultSelectOptionChoose = 'choose'

export const AuthenticatedRoutePrefixes = [
  '/auth/security',
  '/account',
] as const

export const THEME_COLORS = {
  themeDark: '#1a202c',
  themeLight: '#ffffff',
  backgroundDark: '#ffffff',
  backgroundLight: '#1a202c',
} as const
