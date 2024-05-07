const msRefreshBeforeExpires = 3000

export function isTokenExpired(timestamp: string) {
  const expires
    = new Date(timestamp).getTime() - msRefreshBeforeExpires
  return expires < Date.now()
}
