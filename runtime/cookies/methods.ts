import type { Cookie, ModuleOptions } from './types'

export const getAllCookieIdsString = (moduleOptions: ModuleOptions) =>
  getCookieIds([
    ...moduleOptions.cookies.necessary,
    ...moduleOptions.cookies.optional,
  ]).join('')

export const getCookieIds = (cookies: Cookie[] | undefined) => {
  if (!cookies) return []
  return cookies.map((cookie) => cookie.id)
}

export const removeCookie = (name: string) =>
  (useCookie(name).value = undefined)
