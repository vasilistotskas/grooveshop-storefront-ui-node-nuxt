import slugify from '@sindresorhus/slugify'
import { type CookieSerializeOptions, serialize } from 'cookie-es'
import { Cookie, ModuleOptions } from './types'

export const getAllCookieIdsString = (moduleOptions: ModuleOptions) =>
	getCookieIds([
		...moduleOptions.cookies.necessary,
		...moduleOptions.cookies.optional
	]).join('')

export const getCookieId = (cookie: Cookie) => cookie.id || slugify(cookie.name)

export const getCookieIds = (cookies: Cookie[] | undefined) => {
	if (!cookies) return []
	return cookies.map((cookie) => getCookieId(cookie))
}

export const removeCookie = (name: string) =>
	(document.cookie = serialize(name, '', { expires: new Date(0) }))
export const setCookie = (name: string, value: string, options: CookieSerializeOptions) =>
	(document.cookie = serialize(name, value, {
		sameSite: 'strict',
		...options
	}))
