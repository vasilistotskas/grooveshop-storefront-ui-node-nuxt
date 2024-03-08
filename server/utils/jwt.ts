import { decodeJwt } from 'jose'

const msRefreshBeforeExpires = 3000

export function isTokenExpired(tokenOrTimestamp: string) {
  if (tokenOrTimestamp.split('.').length === 3) {
    const { exp } = decodeJwt(tokenOrTimestamp)
    const expires = exp! * 1000 - msRefreshBeforeExpires
    return expires < Date.now()
  } else {
    const expires =
      new Date(tokenOrTimestamp).getTime() - msRefreshBeforeExpires
    return expires < Date.now()
  }
}
