function splitCase(value: string): string[] {
  return value
    .split(/[-_ ]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)
    .filter(Boolean)
}

/**
 * Nuxt's component name for a path relative to a components directory
 * (`resolveComponentNameSegments` in `@nuxt/kit`): a `.client`/`.server`
 * suffix ignored, `index` dropped, and — when the filename starts with
 * the tail of its directory path, compared case-insensitively — those
 * DIRECTORY segments dropped, so the file's own casing wins
 * (`Cart/CartButton.vue` → `CartButton`, `Html/HTMLBlock.vue` →
 * `HTMLBlock`, `Account/2Fa/RecoveryCodes/index.vue` →
 * `Account2FaRecoveryCodes`). Checked against `.nuxt/components.d.ts`.
 */
export function componentName(rel: string): string {
  const parts = rel.replace(/\.vue$/, '').split('/')
  const file = (parts.pop() ?? '').replace(/\.(client|server)$/, '')
  const fileSegments = file === 'index' ? [] : splitCase(file)
  const fileContent = fileSegments.join('/').toLowerCase()
  const prefixSegments = parts.flatMap(splitCase)
  let keep = prefixSegments.length
  const suffix: string[] = []
  for (let index = parts.length - 1; index >= 0; index--) {
    suffix.unshift(...splitCase(parts[index]!).map(s => s.toLowerCase()))
    const suffixContent = suffix.join('/')
    if (fileContent === suffixContent || fileContent.startsWith(`${suffixContent}/`)) {
      keep = prefixSegments.length - suffix.length
      break
    }
  }
  return [...prefixSegments.slice(0, keep), ...fileSegments]
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}
