const getISO6391Code = (locale: string): string => {
  if (!locale) {
    return ''
  }
  const primaryLanguageCode = locale.split(/[-_]/)[0]
  if (primaryLanguageCode.length === 2) {
    return primaryLanguageCode.toLowerCase()
  }
  return ''
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const retry = async <T>(
  func: () => Promise<T>,
  retries: number,
  delayTime: number,
): Promise<T | undefined> => {
  let attempts = 0
  while (attempts < retries) {
    try {
      return await func()
    } catch (error) {
      attempts++
      if (attempts === retries) {
        throw error
      }
      await delay(delayTime)
    }
  }
}

function extractDynamicKeys(str: string) {
  const dynamicKeyPattern = /%\{[a-zA-Z0-9_]+}/g
  return str.match(dynamicKeyPattern) || []
}

function validateDynamicKeys(original: string, translated: string) {
  const originalKeys = extractDynamicKeys(original)
  const translatedKeys = extractDynamicKeys(translated)

  if (originalKeys.length !== translatedKeys.length) {
    return false
  }

  for (let i = 0; i < originalKeys.length; i++) {
    if (originalKeys[i] !== translatedKeys[i]) {
      return false
    }
  }

  return true
}

export { delay, extractDynamicKeys, getISO6391Code, retry, validateDynamicKeys }
